"use client";

import { useState } from "react";
import { Check, Copy, Download, Lock } from "lucide-react";
import { buildFixPack, type FixPackItem } from "@/lib/fix-pack";
import type { ScanResult } from "@/types/index";

function FixItem({ item }: { item: FixPackItem }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(item.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function download() {
    const blob = new Blob([item.content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = item.filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="fix-pack-item">
      <div className="llms-tool-result-head">
        <div>
          <h4 className="fix-pack-title">{item.title}</h4>
          <p>{item.why}</p>
          <p><strong>Where it goes:</strong> {item.placement}</p>
        </div>
        <div className="llms-tool-actions">
          <button type="button" className="btn btn-secondary" onClick={copy}>
            {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
          </button>
          <button type="button" className="btn btn-secondary" onClick={download}>
            <Download className="h-4 w-4" /> Download
          </button>
        </div>
      </div>
      <textarea
        className="llms-tool-output fix-pack-output"
        value={item.content}
        readOnly
        spellCheck={false}
        aria-label={`${item.title} code`}
      />
    </div>
  );
}

type Props = {
  report: Pick<ScanResult, "url" | "checks" | "metadata" | "schemaTypes">;
  hasFullReportAccess: boolean;
  onUpgrade: () => void;
};

export default function FixPackSection({ report, hasFullReportAccess, onUpgrade }: Props) {
  const items = buildFixPack(report);
  if (!items.length) return null;

  return (
    <section className="surface report-card" aria-label="Fix pack">
      <h3 className="section-heading">Fix Pack</h3>
      <p className="section-kicker mt-1">
        Ready-to-paste files generated from this scan. Review them before publishing.
      </p>
      {hasFullReportAccess ? (
        <div className="fix-pack-list mt-4">
          {items.map((item) => <FixItem key={item.id} item={item} />)}
        </div>
      ) : (
        <div className="locked-inline mt-4">
          <Lock className="h-4 w-4" />
          <span>
            {items.length} ready-to-paste fix{items.length === 1 ? "" : "es"} for this page ({items.map((i) => i.title).join(", ")}).{" "}
            <button type="button" className="btn btn-secondary" onClick={onUpgrade}>Unlock the full report</button>
          </span>
        </div>
      )}
    </section>
  );
}
