export function compareQueuePosition(
  a: { queuePosition: number | null; createdAt: Date },
  b: { queuePosition: number | null; createdAt: Date },
) {
  const left = a.queuePosition ?? Number.POSITIVE_INFINITY;
  const right = b.queuePosition ?? Number.POSITIVE_INFINITY;
  if (left !== right) return left - right;
  return a.createdAt.getTime() - b.createdAt.getTime();
}

export function reorderIds(ids: readonly string[], id: string, direction: 'up' | 'down') {
  const index = ids.indexOf(id);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ids.length) return null;
  const next = ids.slice();
  const current = next[index];
  const neighbor = next[target];
  if (current === undefined || neighbor === undefined) return null;
  next[index] = neighbor;
  next[target] = current;
  return next;
}
