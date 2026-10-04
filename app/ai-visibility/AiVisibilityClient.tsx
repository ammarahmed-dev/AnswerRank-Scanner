"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { getBrowserAccessToken } from "@/lib/supabase-browser-lazy";
import { normalizeDomain, suggestPrompts, type PromptResult } from "@/lib/ai-visibility";
import type { StoredRun } from "@/lib/ai-visibility-store";

type RunResponse = {
  brand: { name: string; domain: string };
  prompts: string[];
  engines: string[];
  saved: boolean;
  results: PromptResult[];
  mentionRate: number;
  citationRate: number;
  checked: number;
  error?: string;
};

async function api<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T }> {
  const token = await getBrowserAccessToken();
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    cache: "no-store",
  });
  return { ok: res.ok, status: res.status, data: (await res.json().catch(() => ({}))) as T };
}

function Rates({ mention, citation }: { mention: number; citation: number }) {
  return (
    <p className="vis-rates">
      <span><strong>{mention}%</strong> mention rate</span>
      <span><strong>{citation}%</strong> citation rate</span>
    </p>
  );
}

export default function AiVisibilityClient() {
  const { loading, isAdmin } = useAuth();
  const [brandName, setBrandName] = useState("");
  const [domain, setDomain] = useState("");
  const [topic, setTopic] = useState("");
  const [promptText, setPromptText] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [run, setRun] = useState<RunResponse | null>(null);
  const [history, setHistory] = useState<StoredRun[]>([]);
  const [disabled, setDisabled] = useState(false);

  const loadHistory = useCallback(async () => {
    const { ok, status, data } = await api<{ runs?: StoredRun[] }>("/api/ai-visibility");
    if (status === 404) setDisabled(true);
    else if (ok) setHistory(data.runs ?? []);
  }, []);

  useEffect(() => {
    if (isAdmin) void loadHistory();
  }, [isAdmin, loadHistory]);

  if (loading) return <div className="surface llms-tool"><p className="llms-tool-error" style={{ color: "inherit" }}>Loading...</p></div>;
  if (!isAdmin) return <div className="surface llms-tool"><p>This preview is not available for your account.</p></div>;
  if (disabled) return <div className="surface llms-tool"><p>The tracker is switched off. Set AI_VISIBILITY_ENABLED=true and an engine API key to try it.</p></div>;

  function suggest() {
    if (!brandName.trim() || !topic.trim()) return;
    setPromptText(suggestPrompts({ brandName: brandName.trim(), h1: topic.trim() }).join("\n"));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "loading") return;
    setState("loading");
    setError("");
    const prompts = promptText.split("\n").map((p) => p.trim()).filter(Boolean);
    const { ok, data } = await api<RunResponse>("/api/ai-visibility", {
      method: "POST",
      body: JSON.stringify({ brandName, domain, prompts }),
    });
    if (!ok || !data.results) {
      setError(data.error ?? "The run failed. Check the brand, domain and engine keys.");
      setState("error");
      return;
    }
    setRun(data);
    setState("done");
    void loadHistory();
  }

  const domainHistory = run ? history.filter((h) => h.domain === normalizeDomain(run.brand.domain)).slice(0, 8).reverse() : [];

  return (
    <div className="surface llms-tool">
      <form className="vis-form" onSubmit={submit}>
        <div className="vis-form-row">
          <input type="text" placeholder="Brand name" aria-label="Brand name" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
          <input type="text" placeholder="yourdomain.com" aria-label="Domain" value={domain} onChange={(e) => setDomain(e.target.value)} />
        </div>
        <input type="text" placeholder="What you sell, e.g. project management software" aria-label="Category" value={topic} onChange={(e) => setTopic(e.target.value)} />
        <textarea
          className="vis-prompts"
          rows={6}
          placeholder={"One buyer question per line (max 10), e.g.\nWhat are the best project management tools for agencies?"}
          aria-label="Prompts"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
        />
        <div className="vis-form-actions">
          <button type="button" className="btn btn-secondary" onClick={suggest} disabled={!brandName.trim() || !topic.trim()}>Suggest prompts</button>
          <button type="submit" className="btn btn-primary" disabled={state === "loading" || !brandName.trim() || !domain.trim()}>
            {state === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" /> Asking AI engines...</> : "Run check"}
          </button>
        </div>
      </form>

      {state === "error" && <p role="alert" className="llms-tool-error">{error}</p>}

      {state === "done" && run && (
        <div className="llms-tool-result">
          <div className="crawler-verdict crawler-verdict-good">
            <strong>{run.brand.name} across {run.engines.join(" + ")}</strong>
            <Rates mention={run.mentionRate} citation={run.citationRate} />
            <p className="crawler-verdict-meta">
              {run.checked} answer{run.checked === 1 ? "" : "s"} checked. {run.saved ? "Saved to history." : "Not saved (history table not migrated yet)."}
            </p>
          </div>
          <ul className="extract-list">
            {run.results.map((r, i) => (
              <li key={`${i}-${r.engine}-${r.prompt}`} className={r.error ? "" : r.mentioned || r.cited ? "is-allowed" : "is-blocked"}>
                <div className="extract-head">
                  {r.mentioned || r.cited ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}
                  <strong>{r.prompt}</strong>
                  <span>{r.engine}</span>
                </div>
                {r.error ? (
                  <p className="extract-issue">Engine error: {r.error}</p>
                ) : (
                  <p className="extract-text">
                    {r.mentioned ? "Mentioned" : "Not mentioned"}
                    {r.position ? ` (list position ${r.position})` : ""} · {r.cited ? "domain cited as a source" : "domain not cited"}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {domainHistory.length > 1 && (
        <div className="vis-history">
          <h2>History for {run?.brand.domain}</h2>
          <ul>
            {domainHistory.map((h) => (
              <li key={h.id}>
                <span>{new Date(h.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                <span className="vis-bar" aria-hidden="true"><i style={{ width: `${h.mentionRate}%` }} /></span>
                <span>{h.mentionRate}% mentioned · {h.citationRate}% cited</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
