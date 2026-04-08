export function expandCategoryReorder(
  existingIds: string[],
  requestedIds: string[]
): string[] {
  const requestedIdSet = new Set(requestedIds);
  const requestedQueue = [...requestedIds];

  return existingIds.map((existingId) => {
    if (!requestedIdSet.has(existingId)) {
      return existingId;
    }

    const nextRequestedId = requestedQueue.shift();
    return nextRequestedId ?? existingId;
  });
}
