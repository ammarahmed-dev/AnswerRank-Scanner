import { getMonitorHistorySegments, type HistorySnapshot } from "@/lib/monitor-history";

const CHART_W = 480;
const CHART_H = 100;
const PAD_X = 14;
const PAD_Y = 12;

export default function MonitorScoreHistory({ snapshots }: { snapshots: HistorySnapshot[] }) {
  if (snapshots.length === 0) {
    return <p className="monitor-chart-hint">No scans yet. Click Scan Now to start tracking.</p>;
  }
  if (snapshots.length === 1) {
    return <p className="monitor-chart-hint">Need at least 2 scans to show a trend. Run another scan.</p>;
  }

  const innerW = CHART_W - PAD_X * 2;
  const innerH = CHART_H - PAD_Y * 2;

  const scores = snapshots.map((s) => s.score);
  const rawMin = Math.min(...scores);
  const rawMax = Math.max(...scores);
  const spread = rawMax === rawMin ? 20 : rawMax - rawMin;
  const yMin = Math.max(0, rawMin - Math.ceil(spread * 0.2));
  const yMax = Math.min(100, rawMax + Math.ceil(spread * 0.2));
  const yRange = yMax - yMin || 20;

  const pts = snapshots.map((snap, i) => ({
    x: PAD_X + (i / (snapshots.length - 1)) * innerW,
    y: PAD_Y + innerH - ((snap.score - yMin) / yRange) * innerH,
    score: snap.score,
    date: snap.scanned_at,
  }));

  const segments = getMonitorHistorySegments(snapshots);
  const hasBreaks = segments.length > 1;

  return (
    <>
      <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="monitor-sparkline"
      role="img"
      aria-label="Observed AEO scores; lines connect matching scoring methods"
    >
      {segments.map((indices) => {
        const points = indices.map(i => pts[i]);
        const stroke = points.length < 2 ? "#94a3b8" : points[points.length - 1].score >= points[0].score ? "var(--color-success)" : "var(--color-danger)";
        return (
          <g key={indices[0]}>
            {points.length > 1 && <polyline
              fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              points={points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
            />}
            {points.map((p, i) => (
              <g key={indices[i]}>
                <circle cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="5" fill={stroke} opacity="0.25" />
                <circle cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="3" fill={stroke} />
              </g>
            ))}
          </g>
        );
      })}
      </svg>
      {hasBreaks && <p className="monitor-chart-hint">Scoring methods differ or are unknown. Lines connect only adjacent scans with the same recorded method.</p>}
    </>
  );
}
