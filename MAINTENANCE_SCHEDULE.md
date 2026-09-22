# WhichAIPick Maintenance Schedule (Phase 9)

To maintain the operational integrity, SEO health, and data freshness of the WhichAIPick platform, the following maintenance cadence MUST be followed by the operating team.

## 1. Daily Operations (Continuous Integration)
**Command:** `npm run qa`
**Scope:** `tools.json` schema validation, internal link integrity, metadata validation, schema audit, orphan detection.
**When:** Automatically on every build via `npm run build:cloudflare`.
**Rule:** If `npm run qa` fails, deployment is blocked. The errors must be fixed in the canonical CSV data source before re-deploying.

## 2. Weekly Health Audit
**Command:** `npm run qa:full`
**Scope:** Includes all Daily Operations, PLUS:
- **URL Health Monitor:** Pings all active official and affiliate URLs to detect 404s, 500s, and DNS failures.
- **Data Freshness Engine:** Detects tools that haven't been verified in >90 days.
- **Site Health Report:** Aggregates findings into `reports/SITE_HEALTH.md`.
**When:** Every Monday morning.
**Actionable Steps:**
1. Review `reports/SITE_HEALTH.md`.
2. Fix dead links by finding the new URL or changing the tool's `operationalStatus` to `discontinued`/`unavailable` in the CSV.
3. Review orphaned tools and ensure they are added to relevant categories, guides, or comparison pages.

## 3. Monthly Freshness Sprint
**Scope:** Manual verification of stale tools.
**When:** The first week of every month.
**Actionable Steps:**
1. Run `npm run qa:full` to generate `reports/stale-tools.json`.
2. Filter for tools where `recommendationEligible = true`.
3. Manually visit their websites to verify pricing, features, and operational status.
4. Update their `lastVerifiedAt` timestamp in the master CSV.
5. Aim to keep 100% of `recommendationEligible` tools verified within the last 90 days.

## 4. Quarterly Deep Clean
**When:** Jan 1, Apr 1, Jul 1, Oct 1.
**Actionable Steps:**
1. Run `npm run qa:full`.
2. Run `node scripts/detect-catalog-changes.mjs` against the previous quarter's backup to audit major shifts in the ecosystem.
3. Clean out discontinued tools from `data/seo/best-tools.json` and `data/seo/guides.json`.
4. Re-evaluate categories that have less than 3 tools (consider merging or expanding).

## Monitoring Artifacts
All automated reports are generated locally in the `/reports` directory and are excluded from Git to prevent repository bloat.
- `reports/SITE_HEALTH.md`: Human-readable aggregation.
- `reports/dead-links.json`: Machine-readable URL failures.
- `reports/stale-tools.json`: Machine-readable freshness warnings.
- `reports/seo-health.json`: Machine-readable orphan & metadata warnings.
- `reports/catalog-diff.json`: Machine-readable change detection.
