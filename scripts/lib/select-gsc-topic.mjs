// Select only evidence-backed, unpublished topical-map slots.
// Accepts Search Console query rows; does not write or print private query strings.
import { existsSync } from "node:fs";
import { join } from "node:path";

const normalize = (value) =>
  String(value || "").toLowerCase().normalize("NFKC").replace(/[^a-z0-9]+/g, " ").trim();

function eligibleSlots(map, blogDir) {
  const slots = Array.isArray(map?.slots) ? map.slots : [];
  const pillars = Array.isArray(map?.pillars) ? map.pillars : [];
  return slots.filter((slot) => {
    if (slot.status !== "planned" || typeof slot.slug !== "string") return false;
    if (existsSync(join(blogDir, slot.slug + ".mdx"))) return false;
    if (!Array.isArray(slot.targetQueries) || !slot.targetQueries.length) return false;
    if (slot.role === "hub") return true;
    const pillar = pillars.find((item) => item.id === slot.pillar);
    if (!pillar || typeof pillar.hubSlug !== "string") return false;
    // Prevent drafting a spoke that must link to an unpublished hub.
    return existsSync(join(blogDir, pillar.hubSlug + ".mdx"));
  });
}

function matchingImpressions(slot, rows) {
  const phrases = (slot.targetQueries || []).map(normalize).filter((q) => q.length >= 8);
  let count = 0;
  let total = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    const query = normalize(row?.keys?.[0]);
    const impressions = row?.impressions;
    if (!query || !Number.isFinite(impressions) || impressions <= 0) continue;
    if (phrases.some((phrase) => query === phrase || query.includes(" " + phrase + " ") ||
      query.startsWith(phrase + " ") || query.endsWith(" " + phrase))) {
      total += impressions;
      count += 1;
    }
  }
  return { impressions: total, matchedQueries: count };
}

/**
 * GSC evidence measures visibility of site-owned search impressions, NOT worldwide keyword volume.
 * Only propose a topic when relevant queries have >= minimum observations in the current window.
 * Never return or log actual query terms.
 */
export function selectGscTopic({ map, blogDir, currentRows, previousRows = [], minImpressions = 5 }) {
  if (!Number.isFinite(minImpressions) || minImpressions < 1) {
    throw new Error("minImpressions must be positive");
  }
  const choices = eligibleSlots(map, blogDir)
    .map((slot) => {
      const current = matchingImpressions(slot, currentRows);
      const previous = matchingImpressions(slot, previousRows);
      const trend = Math.max(0, current.impressions - previous.impressions);
      return {
        slug: slot.slug,
        tier: Number.isFinite(slot.tier) ? slot.tier : 3,
        role: slot.role,
        matchedImpressions: current.impressions,
        matchedQueries: current.matchedQueries,
        score: current.impressions + trend * 0.25,
      };
    })
    .filter((item) => item.matchedImpressions >= minImpressions && item.matchedQueries > 0)
    .sort((a, b) => b.score - a.score || a.tier - b.tier ||
      Number(b.role === "hub") - Number(a.role === "hub") || a.slug.localeCompare(b.slug));
  return choices[0] ?? null;
}

export function previousWindow({ startDate, endDate }) {
  // Date-only UTC arithmetic avoids local DST effects.
  const start = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) {
    throw new Error("Invalid GSC date range");
  }
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const prevEnd = new Date(start);
  prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setUTCDate(prevStart.getUTCDate() - days + 1);
  return { startDate: prevStart.toISOString().slice(0, 10),
    endDate: prevEnd.toISOString().slice(0, 10) };
}
