---
name: AEOCheck codebase validation baseline
description: Step 1 validation findings - no files modified, baseline established
type: project
---

## Baseline Established (2026-05-22)

**Validation Status:** Complete - TypeScript build passes, no tests exist, critical issues identified

**Critical Finding:** CategoryScores calculated in scan-core.ts but never saved to ScanResult; recalculated on every display by report-category-scores.ts. This creates risk of divergence.

**Dead Code Confirmed:** ReportSection.tsx (12KB) - never imported, can delete safely.

**Duplication Inventory:**
- hasSupabaseConfig() defined 12 times across different files
- hasFaqContent() logic duplicated (score-engine.ts vs scan/route.ts)
- Three separate scoring systems with different key names
- Two schema recommendation parsing implementations with divergent logic

**Key Mismatches Found:**
- scan-core returns: contentClarity, aiReadiness, trustSignals  
- report-category-scores returns: content, ai-readiness, trust
- ScanResult type defines both but only report keys are used

**Recommended Fix Sequence (Phase 2):**
1. Consolidate scoring to single source in lib/scoring.ts
2. Verify and fix categoryScores discarding behavior
3. Single hasSupabaseConfig export
4. Consolidate content detection functions
5. Delete ReportSection.tsx (confirmed unused)

**How to Apply:** Do NOT implement Phase 2 until explicit approval. Step 1 validation is read-only.
