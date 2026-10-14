export function compareQueuePosition(
  a: { queuePosition: number | null; createdAt: Date; id?: string },
  b: { queuePosition: number | null; createdAt: Date; id?: string },
) {
  const left = a.queuePosition ?? Number.POSITIVE_INFINITY;
  const right = b.queuePosition ?? Number.POSITIVE_INFINITY;
  if (left !== right) return left - right;
  const chronological = a.createdAt.getTime() - b.createdAt.getTime();
  return chronological || (a.id ?? '').localeCompare(b.id ?? '');
}
