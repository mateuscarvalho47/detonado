const LUA = `
  local key = KEYS[1]
  local timeWindow = tonumber(ARGV[1])
  local max = tonumber(ARGV[2])
  local continueExceeding = ARGV[3] == 'true'
  local exponentialBackoff = ARGV[4] == 'true'
  local MAX_SAFE_INTEGER = (2^53) - 1
  local current = redis.call('INCR', key)

  if current == 1 or (continueExceeding and current > max) then
    redis.call('PEXPIRE', key, timeWindow)
  elseif exponentialBackoff and current > max then
    local backoffExponent = current - max - 1
    timeWindow = math.min(timeWindow * (2 ^ backoffExponent), MAX_SAFE_INTEGER)
    redis.call('PEXPIRE', key, timeWindow)
  else
    timeWindow = redis.call('PTTL', key)
  end

  return {current, timeWindow}
`;

type RedisEval = {
  eval: (script: string, options: { keys: string[]; arguments: string[] }) => Promise<unknown>;
};

type StoreOptions = {
  continueExceeding?: boolean;
  exponentialBackoff?: boolean;
  routeInfo?: { method?: string; url?: string };
};

type IncrCallback = (error: Error | null, result?: { current: number; ttl: number }) => void;

function readPair(value: unknown) {
  if (!Array.isArray(value) || value.length < 2) {
    throw new Error('rate limit script returned an unexpected value');
  }
  const current = Number(value[0]);
  const ttl = Number(value[1]);
  if (!Number.isFinite(current) || !Number.isFinite(ttl)) {
    throw new Error('rate limit script returned an unexpected value');
  }
  return { current, ttl };
}

function asError(error: unknown) {
  return error instanceof Error ? error : new Error('rate limit store failed');
}

export function createRedisRateLimitStore(redis: RedisEval, prefix = 'detonado-rl:') {
  return class NodeRedisRateLimitStore {
    constructor(
      private readonly options: StoreOptions = {},
      private readonly keyPrefix = prefix,
    ) {}

    incr(key: string, callback: IncrCallback, timeWindow = 60_000, max = 1) {
      redis
        .eval(LUA, {
          keys: [`${this.keyPrefix}${key}`],
          arguments: [
            String(timeWindow),
            String(max),
            String(Boolean(this.options.continueExceeding)),
            String(Boolean(this.options.exponentialBackoff)),
          ],
        })
        .then((value) => {
          try {
            callback(null, readPair(value));
          } catch (error) {
            callback(asError(error));
          }
        })
        .catch((error: unknown) => {
          callback(asError(error));
        });
    }

    child(routeOptions: StoreOptions) {
      const info = routeOptions.routeInfo;
      const suffix = info?.method && info.url ? `${info.method}${info.url}-` : '';
      return new NodeRedisRateLimitStore(routeOptions, `${this.keyPrefix}${suffix}`);
    }
  };
}
