export function parseTrustProxy(value: unknown): boolean | number {
  if (value === undefined || value === null || value === '') return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === 'string') {
    const raw = value.trim().toLowerCase();
    if (raw === '' || raw === 'false') return false;
    if (raw === 'true') return true;
    if (/^\d+$/.test(raw)) return Number(raw);
  }
  throw new Error('TRUST_PROXY must be true, false, or a hop count');
}
