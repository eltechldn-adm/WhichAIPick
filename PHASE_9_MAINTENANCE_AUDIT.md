# PHASE 9 MAINTENANCE & FRAGILITY AUDIT

## Overview
This audit identifies legacy code, obsolete files, duplicate validators, fragile dependencies, and scratch scripts that have accumulated throughout Phases 1-8. None of these items are required for the ongoing operations of WhichAIPick and pose maintenance risks.

## CRITICAL RISK FINDINGS
None identified. The core canonical data pipeline (`convert-xlsx-to-tools-json.mjs` -> `tools.json`) is generally respected, and manual editing of `tools.json` does not appear to be a frequent issue, although no automated safeguards prevent it.

## HIGH RISK FINDINGS
1. **Unintegrated QA Scripts:**
   There is a lack of a unified `npm run qa` or `npm run qa:full` command. Validators like `validate-sitemap.mjs`, `audit-schema.mjs`, and `crawl-links.mjs` must be run manually, making it easy to forget them before deployment. This increases the fragility of the build process.
2. **Preview Environment Safety:**
   Currently, preview branches on Cloudflare do not have hardcoded `X-Robots-Tag: noindex, follow` headers in the codebase. While Cloudflare often adds them automatically to `*.pages.dev`, relying on platform defaults rather than explicit code definitions is fragile.

## MEDIUM RISK FINDINGS
1. **Obsolete Phase 4 & 5 Migration Scripts:**
   The `scripts/` directory contains 31 obsolete batch enrichment scripts (`enrich-batch-*.mjs`). These were one-time use scripts for enriching the dataset and are now dead code polluting the repo.
2. **Duplicate/Dead Client Scripts:**
   - `js/shortlist.js` (Replaced by `user-state.js` and `/my-tools/`)
   - `js/shortlist-page.js` (Only referenced in the legacy `shortlist.html`)
   - `shortlist/index.html` (Legacy UI, now replaced entirely by `/my-tools/index.html`)

## LOW RISK FINDINGS
1. **Unnecessary Scratch Scripts:**
   Various one-time scripts exist that serve no current purpose:
   - `scripts/append-descriptions.mjs`
   - `scripts/append-pricing.mjs`
   - `scripts/apply-consent-tags.mjs`
   - `scripts/audit-phase6.mjs`
   - `scripts/check-missing.mjs`
   - `scripts/check-unenriched.mjs`
   - `scripts/dry-run-merge.mjs`
   - `scripts/enrich-pricing.js`
   - `scripts/enrich_descriptions.js`
   - `scripts/export-enrichment-batch.mjs`
   - `scripts/find-unenriched.js`
   - `scripts/find-unenriched.mjs`
   - `scripts/harden-pricing.mjs`
   - `scripts/harden-tone.mjs`
   - `scripts/update-internal-links.mjs`
   - `scripts/validate-batch-6.mjs`
   - `scripts/verify-targets.mjs`
   - `scripts/verify-tier-a.mjs`
   - `scripts/write-missing.mjs`
   - `scripts/phase7-fix-consent-heads.mjs`
   - `scripts/phase7-fix-consent-heads-all.mjs`
2. **Gitignore Omissions:**
   `reports/*.json` and `reports/*.md` are not ignored, which could cause git pollution if temporary files are checked in.

## Recommendations for Cleanup
- Delete all identified obsolete batch and scratch scripts.
- Delete `js/shortlist.js`, `js/shortlist-page.js`, and `shortlist/index.html`.
- Introduce a strict orchestrator command (`npm run qa:full`) that runs the entire validation suite to enforce build integrity.
- Add `_headers` to Cloudflare Pages for strict SEO preview safety.
