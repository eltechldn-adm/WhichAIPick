# PHASE 6C.1D — CANARY ROLLOUT & PRODUCTION ROLLBACK RUNBOOK
**Project**: WhichAIPick.com  
**Target Migration**: Tool Page V2 Static Cutover  
**Document Classification**: Operational Runbook & Release Strategy (Planning Only)  
**Execution Status**: READ-ONLY / AWAITING EXPLICIT OWNER AUTHORISATION  

---

## 1. PURPOSE & POLICY
This runbook establishes the exact technical sequence, validation gates, canary isolation rules, and instantaneous recovery procedures required to migrate WhichAIPick.com tool pages from legacy V1 to Tool Page V2.

> **CRITICAL PRODUCTION PROTECTION RULE**  
> Under Master Control Directive (MCD) v2.0, NO release commands, git merges to `main`, or production Cloudflare cutovers may be executed without separate, explicit written project owner approval. This document governs future operational execution only.

---

## 2. STATIC ARCHITECTURE CANARY STRATEGY
Because WhichAIPick operates as a static site hosted via GitHub → Cloudflare Pages without an intermediary reverse-proxy routing worker:
- Traditional traffic-percentage canaries (e.g., 5% of requests randomly routed to V2 via cookies) are not supported by the static tier.
- **Individual Route Replacement Canary** is the approved, technically robust strategy:
  1. A curated, diverse set of **6 low-operational-risk tool routes** are selected.
  2. In the canary release, only those 6 tools have their canonical production paths (`/tools/{id}/index.html`) replaced with Tool Page V2 HTML.
  3. The remaining 876 tools remain on legacy V1 HTML.
  4. The canary deployment is validated on a branch preview, then promoted to production.
  5. Crawl stability, Google Search Console indexation signals, visual rendering, and conversion telemetry are observed before authorizing the full 882-tool cutover.

---

## 3. PROPOSED CANARY SCOPE
The canary cohort contains 6 tools intentionally balanced across categories, pricing models, personas, and layout complexity. **Flagship high-volume tools (ChatGPT, Claude, Midjourney) are deliberately excluded** to avoid exposing core brand traffic to unvetted cutover edge cases.

| Tool ID | Tool Name | Category | Pricing Model | Layout / Feature Characteristics | Operational Risk | Rationale for Selection |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `aider` | Aider | Development | Free / OSS | Terminal CLI, GitHub link, open-source badges | Low | Validates open-source license badges, CLI documentation layout, developer persona. |
| `activepieces` | ActivePieces | Automation | Freemium | Workflow integration, free tier badge, multi-plan pricing | Low | Validates automation taxonomy, integration pills, freemium starting price. |
| `akiflow` | Akiflow | Productivity | Paid | Subscription pricing, calendar integration, single workflow | Low | Validates paid SaaS pricing presentation without free tier, productivity taxonomy. |
| `adcreativeai` | AdCreative.ai | Marketing | Paid | Marketing use cases, business persona, extensive feature list | Low | Validates marketing category layout, conversion CTA, feature groups. |
| `mindgrasp` | Mindgrasp | Education | Paid | Education taxonomy, student persona, concise taxonomy-derived profile | Low | Validates concise profile rendering and education category routing. |
| `crawl4ai` | Crawl4AI | Development | Free / OSS | Web crawler for LLMs, GitHub repo, open source badge | Low | Validates technical developer audience, zero pricing barrier, data extraction tags. |

### Exact Route Mapping for Canary Cohort
| Tool ID | Existing Production Route | Proposed V2 Production Route | Staging V2 Preview Route |
| :--- | :--- | :--- | :--- |
| `aider` | `https://whichaipick.com/tools/aider/` | `https://whichaipick.com/tools/aider/` | `https://2ad28bba.whichaipick.pages.dev/tool-page-v2-preview/catalog/aider/` |
| `activepieces` | `https://whichaipick.com/tools/activepieces/` | `https://whichaipick.com/tools/activepieces/` | `https://2ad28bba.whichaipick.pages.dev/tool-page-v2-preview/catalog/activepieces/` |
| `akiflow` | `https://whichaipick.com/tools/akiflow/` | `https://whichaipick.com/tools/akiflow/` | `https://2ad28bba.whichaipick.pages.dev/tool-page-v2-preview/catalog/akiflow/` |
| `adcreativeai` | `https://whichaipick.com/tools/adcreativeai/` | `https://whichaipick.com/tools/adcreativeai/` | `https://2ad28bba.whichaipick.pages.dev/tool-page-v2-preview/catalog/adcreativeai/` |
| `mindgrasp` | `https://whichaipick.com/tools/mindgrasp/` | `https://whichaipick.com/tools/mindgrasp/` | `https://2ad28bba.whichaipick.pages.dev/tool-page-v2-preview/catalog/mindgrasp/` |
| `crawl4ai` | `https://whichaipick.com/tools/crawl4ai/` | `https://whichaipick.com/tools/crawl4ai/` | `https://2ad28bba.whichaipick.pages.dev/tool-page-v2-preview/catalog/crawl4ai/` |

---

## 4. PRE-DEPLOYMENT PREREQUISITES
Before initiating any deployment command sequence:
1. **Repository Hygiene**: Working directory must be clean (`git status` shows 0 uncommitted changes).
2. **Current Baseline Commit**: The verified production baseline is commit `0c71092e` on branch `main`. Note: `97cc7cf9` is the tip of development branch `phase-review`, NOT the production baseline.
3. **Data Verification**: `data/tools.phase11.staged.json` contains exactly 882 tools and passes `npm run catalog:phase11:validate`.
4. **Cloudflare Access**: Release manager has administrative access to Cloudflare Pages dashboard (`WhichAIPick` project).
5. **Rollback Target Identified**: The specific production deployment ID corresponding to `0c71092e` in Cloudflare Pages must be recorded in the release log before initiating the cutover. Preview deployment IDs must NEVER be used as production rollback targets.

---

## 5. FUTURE RELEASE EXECUTION PROCEDURES (UPON OWNER APPROVAL)

### Git Release Architecture & Branch Isolation Policy
Production `main` is at `0c71092e`. The active development branch `phase-review` is 27 commits ahead of `main` (containing comparison engine work, review reports, and staged artifacts).
- **CRITICAL RESTRICTION**: Running `git merge --ff-only` from `phase-review` into `main` is **STRICTLY PROHIBITED**. It would fast-forward production across 27 unvetted development commits, violating release isolation.
- **ISOLATED RELEASE BRANCH**: The release branch `release/tool-page-v2-canary` must be branched directly from production `main` (`0c71092e`), containing ONLY the audited canary generator integration (`scripts/generate-static-pages.mjs`, `scripts/tool-page-2/canary-selection.mjs`, `scripts/tool-page-2/render-production-tool-page-v2.mjs`, and `data/release/tool-page-v2-canary.json`).

### Phase A: Canary Generation & Preview Verification
To execute the canary on the isolated release branch:

```bash
# 1. Create clean release branch directly from production main
git checkout main
git pull origin main
git checkout -b release/tool-page-v2-canary

# 2. Port only the audited canary implementation files
# (scripts/tool-page-2/canary-selection.mjs, scripts/tool-page-2/render-production-tool-page-v2.mjs,
#  scripts/tool-page-2/render-tool-page-v2.mjs, scripts/generate-static-pages.mjs, data/release/tool-page-v2-canary.json)

# 3. Verify fail-closed configuration guard
npm run qa:canary:config

# 4. Execute Cloudflare-equivalent build in canary mode
TOOL_PAGE_V2_CANARY=1 npm run build:cloudflare

# 5. Verify post-build canary output guard (verifies 6 V2, 876 V1, canonicals, robots)
npm run qa:canary:output

# 6. Commit isolated release branch and push to trigger Cloudflare Branch Preview
git add data/release/ scripts/
git commit -m "feat(release): isolated canary rollout of Tool Page V2 for 6 cohort tools"
git push origin release/tool-page-v2-canary
```

### Phase B: Branch Preview Validation
Once Cloudflare Pages generates the preview URL (e.g., `https://release-tool-page-v2-canary.whichaipick.pages.dev`):
```bash
# 1. Verify HTTP 200 and visual integrity on the 6 canary routes
curl -I https://release-tool-page-v2-canary.whichaipick.pages.dev/tools/aider/
curl -I https://release-tool-page-v2-canary.whichaipick.pages.dev/tools/activepieces/
curl -I https://release-tool-page-v2-canary.whichaipick.pages.dev/tools/akiflow/
curl -I https://release-tool-page-v2-canary.whichaipick.pages.dev/tools/adcreativeai/
curl -I https://release-tool-page-v2-canary.whichaipick.pages.dev/tools/mindgrasp/
curl -I https://release-tool-page-v2-canary.whichaipick.pages.dev/tools/crawl4ai/

# 2. Verify preview headers contain noindex safeguard
curl -I https://release-tool-page-v2-canary.whichaipick.pages.dev/tools/aider/ | grep -i "x-robots-tag"
# Expected: X-Robots-Tag: noindex, follow

# 3. Verify that non-canary tools remain functional legacy V1 pages
curl -I https://release-tool-page-v2-canary.whichaipick.pages.dev/tools/chatgpt/
curl -I https://release-tool-page-v2-canary.whichaipick.pages.dev/tools/claude/
```

### Phase C: Production Promotion (Owner Sign-off Required)
When preview validation passes 100%:
```bash
git checkout main
# Use a non-fast-forward merge commit to create an explicit, atomic revert boundary
git merge --no-ff release/tool-page-v2-canary -m "Merge release/tool-page-v2-canary: Tool Page V2 6-tool canary rollout"
git push origin main
```
Cloudflare Pages automatically deploys `main` to `https://whichaipick.com`. Note the newly created deployment ID immediately.

---

## 6. POST-DEPLOYMENT VERIFICATION CHECKLIST
Within 15 minutes of production deployment:
- [ ] **Canary HTTP Response**: All 6 canary URLs return `200 OK` with `Content-Type: text/html`.
- [ ] **Robots Directive**: Canary pages emit `<meta name="robots" content="index,follow">` and production `_headers` has no `X-Robots-Tag: noindex`.
- [ ] **Canonical URL**: Canary pages emit exact canonical link `<link rel="canonical" href="https://whichaipick.com/tools/{id}/">`.
- [ ] **Stylesheet Integrity**: `/css/global.css` and `/css/pages/tool-page-v2.css` load with `200 OK` and zero 404s.
- [ ] **Non-Canary Integrity**: Non-canary tools (`/tools/chatgpt/`, `/tools/midjourney/`) render correctly without regressions (V1 template preserved).
- [ ] **Comparison Links**: Clicking `Compare {Tool}` leads to `/compare#tools={id}` and loads comparison engine smoothly.
- [ ] **Affiliate & Outbound**: Outbound CTA links have `target="_blank" rel="noopener noreferrer"` (or `sponsored`).
- [ ] **Site Header & Footer**: Navigation, mobile drawer, search modal, and legal footer render without style clipping.

---

## 7. ROLLBACK RUNBOOK & RECOVERY PROCEDURES

### Rollback Trigger Criteria (Immediate Abort)
Any of the following conditions triggers an IMMEDIATE rollback:
1. **Critical Defect (P0)**: Any 5xx or 404 error on any canary route or non-canary tool route.
2. **SEO Hazard (P0)**: Production canary pages accidentally retain `noindex` or emit invalid canonical tags.
3. **Layout Breakage (P1)**: Total CSS failure, overlapping headers, or unresponsive viewports on major devices.
4. **Monetisation Breakage (P1)**: Outbound affiliate/website links fail or lead to dead endpoints.
5. **Comparison Engine Crash (P1)**: `/compare#tools={id}` fails to parse hash or crashes client-side JavaScript.

---

### Procedure A: Instant Cloudflare Dashboard Rollback (Primary — < 60 Seconds)
*Use this procedure when immediate production traffic restoration is needed.*

1. Open Cloudflare Dashboard → **Workers & Pages** → **WhichAIPick**.
2. Select the **Deployments** tab.
3. Filter by **Production** deployments (do NOT select branch preview deployments).
4. Locate the pre-recorded known-good production deployment ID (the deployment corresponding to baseline commit `0c71092e`).
5. Click the three dots (`...`) next to the deployment → Select **Rollback to this deployment**.
6. Confirm the action in the prompt modal.
7. Cloudflare instantly updates edge routing and edge caches to serve the selected immutable snapshot worldwide without triggering a rebuild.
8. Verification: Run `curl -s https://whichaipick.com/tools/aider/ | grep -c "tool-page-v2"` to verify 0 matches (legacy V1 restored).

---

### Procedure B: Non-Destructive Git Revert (< 5 Minutes)
*Use this procedure to restore clean repository history on main following a production rollback or issue.*

```bash
# 1. Ensure on main branch with latest commits
git checkout main
git pull origin main

# 2. Identify the exact canary release merge or commit SHA
# DO NOT run arbitrary 'git revert HEAD' without verifying commit identity
git log -n 5 --oneline

# 3. Non-destructively revert the specific release commit:
# If merged with --no-ff (merge commit):
git revert -m 1 <CANARY_RELEASE_MERGE_COMMIT_SHA> --no-edit

# If squashed or direct commit:
git revert <CANARY_RELEASE_COMMIT_SHA> --no-edit

# 4. Push revert commit to main (triggers automated Cloudflare clean rebuild)
git push origin main

# 5. Monitor Cloudflare build logs:
# The build runs 'npm run build:cloudflare' on the reverted commit, deterministically generating 882 V1 pages.
```

---

### Procedure C: Non-Destructive Safe Redeployment from Clean State
*Use if git history becomes diverged or unresolvable.*

```bash
# 1. Checkout a new clean recovery branch directly from known-good baseline commit 0c71092e
git checkout -b hotfix/restore-known-good 0c71092e

# 2. Merge cleanly or cherry-pick required hotfixes without destructive force operations
# NEVER execute 'git reset --hard' on remote tracking branches
# NEVER execute 'git push --force' to main

# 3. Submit PR from hotfix/restore-known-good to main for peer review and automated CI validation
# 4. Merge PR to main to deploy clean baseline via standard Cloudflare webhook
```

---

## 8. ESCALATION & CONTACT MATRIX
- **Technical Architect & Build Operator**: Autonomous Build Operator (Antigravity)
- **Deployment & Release Authority**: Project Owner (Eltech / Elaina Marriott)
- **Escalation SLA**: Immediate rollback execution within 5 minutes of P0 detection.
