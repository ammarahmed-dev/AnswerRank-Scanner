import { Sparkles } from "lucide-react";
import { badgeTone, type ReportIssue } from "@/lib/report-view-model";

export function MetaRow({ label, value, charLimit, isUrl }: { label: string; value: string; charLimit?: number; isUrl?: boolean }) {
  const missing = !value;
  const over = charLimit && value.length > charLimit;
  return (
    <div className="metadata-row">
      <span className="metadata-label">{label}</span>
      <span className={`metadata-value${missing ? " metadata-missing" : ""}${over ? " metadata-over" : ""}`}>
        {missing ? "Not set" : value}
      </span>
      {!missing && charLimit && (
        <span className={`metadata-char-count${over ? " metadata-char-over" : ""}`}>
          {value.length}/{charLimit}
        </span>
      )}
      {!missing && isUrl && <span className="metadata-char-count">URL</span>}
    </div>
  );
}

export function PriorityColumn({ title, description, items, tone }: { title: string; description: string; items: ReportIssue[]; tone: "critical" | "high" | "medium" }) {
  return (
    <article className="action-plan-column">
      <div className="action-plan-head">
        <span>{title}</span>
        <strong>{items.length}</strong>
      </div>
      <p className="action-plan-desc">{description}</p>
      <div className="action-plan-items">
        {items.length ? items.slice(0, 6).map((item) => (
          <div key={`${title}-${item.id}`} className="action-plan-item">
            <span className="action-plan-icon flex-shrink-0"><Sparkles className="h-3.5 w-3.5" /></span>
            <div className="action-plan-item-text flex-1 min-w-0">
              <p>{item.title}</p>
              <small>{item.problem}</small>
            </div>
            <span className={`mini-pill ${badgeTone(tone)} flex-shrink-0`}>{item.priority}</span>
          </div>
        )) : <p className="muted-copy">No issues in this group.</p>}
      </div>
    </article>
  );
}
