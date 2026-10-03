/**
 * Runs `worker` over `items` with a concurrency limit, and stops starting new items once
 * `budgetMs` has elapsed (items already running are allowed to finish). Returns how many items
 * were started, so callers can leave the rest for the next run.
 */
export async function runWithBudget<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  options: { concurrency: number; budgetMs: number; now?: () => number }
): Promise<{ started: number; skipped: number }> {
  const now = options.now ?? Date.now;
  const deadline = now() + options.budgetMs;
  let next = 0;

  async function lane() {
    while (next < items.length && now() < deadline) {
      const item = items[next++];
      try {
        await worker(item);
      } catch {
        // Workers handle and record their own errors; one failure must not stop the batch.
      }
    }
  }

  const lanes = Array.from({ length: Math.max(1, Math.min(options.concurrency, items.length)) }, lane);
  await Promise.all(lanes);
  return { started: next, skipped: items.length - next };
}
