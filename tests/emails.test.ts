import { describe, expect, it } from "vitest";
import { welcomeEmailHtml } from "@/lib/emails/welcome";
import { followupEmailHtml } from "@/lib/emails/followup";
import { FREE_MONTHLY_SCAN_LIMIT } from "@/lib/usage-limits";

describe("email templates", () => {
  it("welcome email states the configured free scan limit", () => {
    expect(welcomeEmailHtml("a@b.co")).toContain(`${FREE_MONTHLY_SCAN_LIMIT} scans per month included`);
  });

  it("follow-up email contains no invented score statistics", () => {
    expect(followupEmailHtml("a@b.co")).not.toMatch(/\d+\/100/);
  });

  it("no em dashes in customer-facing copy", () => {
    expect(welcomeEmailHtml("a@b.co")).not.toContain("—");
    expect(followupEmailHtml("a@b.co")).not.toContain("—");
  });
});
