import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import ServiceCta from "@/app/components/ServiceCta";
import { SERVICES_PATH } from "@/lib/service-enquiry";
import sitemap from "@/app/sitemap";

describe("implementation services discovery", () => {
  it.each(["content", "report"] as const)("uses one public destination for %s without private report fields", placement => {
    const html = renderToStaticMarkup(createElement(ServiceCta, { placement }));
    expect(html).toContain(`${SERVICES_PATH}?source=${placement}`);
    expect(html).not.toContain("/contact?");
    expect(html).not.toMatch(/reportId|user_id|token=/);
    expect(html).toContain("separate from scanner plans");
    if (placement === "report") expect(html).toContain("print-hidden");
  });
  it("lists the canonical page in XML and HTML discovery", async () => {
    expect((await sitemap()).filter(entry => entry.url.endsWith(SERVICES_PATH))).toHaveLength(1);
    expect(readFileSync("app/sitemap/page.tsx", "utf8")).toContain(`href="${SERVICES_PATH}"`);
  });
});
