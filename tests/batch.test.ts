import { describe, expect, it } from "vitest";
import { runWithBudget } from "@/lib/batch";

describe("runWithBudget", () => {
  it("processes every item within budget, respecting the concurrency limit", async () => {
    let active = 0;
    let peak = 0;
    const done: number[] = [];
    const result = await runWithBudget([1, 2, 3, 4, 5, 6, 7], async (n) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      done.push(n);
      active--;
    }, { concurrency: 3, budgetMs: 10_000 });
    expect(result).toEqual({ started: 7, skipped: 0 });
    expect(done.sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(peak).toBe(3);
  });

  it("stops starting new items once the budget is spent", async () => {
    let clock = 0;
    const result = await runWithBudget([1, 2, 3, 4, 5], async () => {
      clock += 100;
    }, { concurrency: 1, budgetMs: 250, now: () => clock });
    expect(result).toEqual({ started: 3, skipped: 2 });
  });

  it("keeps going when a worker throws", async () => {
    const done: number[] = [];
    const result = await runWithBudget([1, 2, 3], async (n) => {
      if (n === 2) throw new Error("boom");
      done.push(n);
    }, { concurrency: 1, budgetMs: 10_000 });
    expect(result.started).toBe(3);
    expect(done).toEqual([1, 3]);
  });

  it("handles an empty list", async () => {
    expect(await runWithBudget([], async () => undefined, { concurrency: 4, budgetMs: 1000 })).toEqual({ started: 0, skipped: 0 });
  });
});
