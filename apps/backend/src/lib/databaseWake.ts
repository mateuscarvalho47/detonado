import { DatabaseUnavailableError } from '@/lib/errors.js';

const WAKE_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
  '57P01',
  '57P02',
  '57P03',
  '08000',
  '08001',
  '08003',
  '08004',
  '08006',
  '53300',
  'P1001',
  'P1002',
  'P1017',
  'P2024',
]);

const WAKE_KINDS = new Set([
  'DatabaseNotReachable',
  'ConnectionClosed',
  'SocketTimeout',
  'TooManyConnections',
]);

const WAKE_MESSAGES = [
  'connection terminated',
  'terminating connection',
  'administrator command',
  'connection error and is not queryable',
  "couldn't connect to compute",
  'could not connect to server',
  'server closed the connection',
  'database system is starting up',
  'database system is shutting down',
  'cannot connect now',
  'connection reset',
  'connection refused',
];

const RETRY_DELAYS_MS = [250, 750, 2000];

function readError(err: unknown): { codes: string[]; kinds: string[]; text: string } {
  const codes: string[] = [];
  const kinds: string[] = [];
  const texts: string[] = [];
  const seen = new Set<unknown>();

  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    const record = value as Record<string, unknown>;
    if (typeof record.code === 'string') codes.push(record.code);
    if (typeof record.kind === 'string') kinds.push(record.kind);
    if (typeof record.message === 'string') texts.push(record.message);
    if ('cause' in record) visit(record.cause);
  };

  visit(err);
  return { codes, kinds, text: texts.join('\n').toLowerCase() };
}

export function isDatabaseAsleep(err: unknown): boolean {
  const { codes, kinds, text } = readError(err);
  if (codes.some((code) => WAKE_CODES.has(code))) return true;
  if (kinds.some((kind) => WAKE_KINDS.has(kind))) return true;
  return WAKE_MESSAGES.some((snippet) => text.includes(snippet));
}

export function mapDatabaseUnavailable(err: unknown): DatabaseUnavailableError | null {
  if (!isDatabaseAsleep(err)) return null;
  return new DatabaseUnavailableError();
}

export async function withDatabaseRetry<T>(
  run: () => Promise<T>,
  options?: { delaysMs?: number[]; onRetry?: (err: unknown) => void },
): Promise<T> {
  const delaysMs = options?.delaysMs ?? RETRY_DELAYS_MS;
  let attempt = 0;

  for (;;) {
    try {
      return await run();
    } catch (err) {
      const wait = delaysMs[attempt];
      if (wait === undefined || !isDatabaseAsleep(err)) throw err;
      attempt += 1;
      options?.onRetry?.(err);
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
}
