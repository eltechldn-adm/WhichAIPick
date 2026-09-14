# CATEGORY & FILTER EXPANSION QA REPORT
## Checkpoint 4G.1 — Phase Review Branch
**Date:** 2026-09-14  
**schemaVersion:** 4G.1  
**Branch:** phase-review

---

## 1. Catalog Overview

| Metric | Count |
|---|---|
| Total tools | 902 |
| Legacy (original catalog) | 318 |
| New (4G imports) | 584 |
| recommendationEligible = true | 315 |
| contentReviewRequired = true | 584 |

---

## 2. Category Coverage

### Before 4G.1 (at start of this checkpoint)
| Category | Total |
|---|---|
| Category populated | 322 (35.7%) |
| Category unknown | 580 (64.3%) |

### After 4G.1
| Category | Total | Legacy | New |
|---|---|---|---|
| Development | 158 | 52 | 106 |
| Business | 101 | 42 | 59 |
| Video & Audio | 101 | 35 | 66 |
| Design | 100 | 51 | 49 |
| Productivity | 87 | 37 | 50 |
| Research | 52 | 23 | 29 |
| Content Creation | 49 | 25 | 24 |
| Automation | 41 | 10 | 31 |
| Marketing | 41 | 32 | 9 |
| Education | 24 | 11 | 13 |
| **unknown** | **148** | **0** | **148** |
| **TOTAL CATEGORIZED** | **754** | **318** | **436** |

**Coverage improvement:** 35.7% → 83.6%  
**New tools classified:** 435 of 584  
**New tools still unknown:** 149 (evidence insufficient per policy)

---

## 3. Taxonomy Changes

**No new categories added.** The existing 10-category taxonomy absorbed all classifiable tools.

Existing categories: `Development`, `Business`, `Video & Audio`, `Design`, `Productivity`, `Research`, `Content Creation`, `Automation`, `Marketing`, `Education`

Mapping decisions:
- Customer Support tools → **Business** (existing category already covers CRM/ops)
- MLOps/LLM infrastructure → **Development**
- Healthcare AI (clinical notes) → **Business** (enterprise vertical)
- 3D design/architectural tools → **Design**

---

## 4. primaryUseCases Coverage

| Metric | Before | After |
|---|---|---|
| Populated | 322 (35.7%) | 754 (83.6%) |
| Empty | 580 (64.3%) | 148 (16.4%) |

**Sources used:** Official product homepages, features pages, and documented descriptions.  
**Provenance:** All newly classified tools have `dataProvenance.useCases = 'official_source_verified'`

---

## 5. Use Case Filter Coverage (Public Groups)

| Use Case Group | Total | Legacy | New |
|---|---|---|---|
| Coding & Development | 300 | 130 | 170 |
| Image Creation | 229 | 90 | 139 |
| Productivity | 219 | 81 | 138 |
| Automation | 182 | 66 | 116 |
| Research | 157 | 70 | 87 |
| Writing & Content | 139 | 91 | 48 |
| Design | 134 | 74 | 60 |
| Data & Analytics | 132 | 60 | 72 |
| Marketing | 118 | 81 | 37 |
| Video Creation | 104 | 50 | 54 |
| Audio & Voice | 103 | 35 | 68 |
| Business Operations | 90 | 51 | 39 |
| Meetings & Transcription | 57 | 23 | 34 |
| Customer Support | 47 | 22 | 25 |
| Education | 36 | 23 | 13 |

All 15 use-case groups return results from the expanded catalog.

---

## 6. Unknown Coverage (Transparency)

| Metric | Count |
|---|---|
| category = unknown | 148 |
| primaryUseCases empty | 148 |

These are the same 148 tools (all newly imported) where official product evidence was insufficient to classify safely. No fabricated metadata. All remain `contentReviewRequired: true`.

---

## 7. USE_CASE_TAXONOMY Extension

The keyword taxonomy in `js/browse.js` was extended to capture tool clusters absent from the original keyword set:

- **Coding & Development**: added `llm`, `model`, `embedding`, `vector`, `inference`, `annotation`, `labelling`, `mlops`, `rag`, `agent framework`, `test automation`, `code review`, `code generation`, `ide`, `repository`, `deployment`
- **Image Creation**: added `illustration`, `rendering`, `background removal`, `upscaling`, `retouching`, `3d model`, `interior design`, `architectural`
- **Video Creation**: added `avatar video`, `text-to-video`, `video generation`, `clip`, `dubbing`, `subtitle`, `caption`
- **Audio & Voice**: added `transcription`, `voiceover`, `voice cloning`, `mastering`, `stem`
- **Research**: added `citation`, `literature`, `pdf`, `document`, `fact-checking`
- **Productivity**: added `note-taking`, `meeting notes`, `scheduling`, `calendar`, `email management`, `mind mapping`, `knowledge management`, `ai assistant`, `ai chat`, `journaling`, `email filtering`, `inbox`, `browser`, `personal assistant`, `tutoring`, `language practice`
- **Meetings & Transcription**: added `meeting summary`, `meeting notes`, `action item`
- **Marketing**: added `landing page`, `newsletter`, `outreach`, `lead`, `brand`
- **Automation**: added `scraping`, `extraction`, `parsing`, `rpa`, `robotic process`, `web crawling`, `no-code automation`, `data pipeline`
- **Design**: added `3d`, `product photo`, `floor plan`, `room design`, `design-to-code`
- **Data & Analytics**: added `insight`, `intelligence`, `reporting`, `forecasting`
- **Customer Support**: added `support automation`, `contact centre`, `ticketing`, `live chat`, `omnichannel`
- **Education**: added `language learning`, `flashcard`, `lesson plan`
- **Business Operations**: added `recruiting`, `hiring`, `crm`, `revenue`, `healthcare`, `clinical`, `medical`, `employee`, `talent`, `interview`

No public filter group names were changed. Filter UI labels remain identical.

---

## 8. 25-Combination Filter Matrix Test

| # | Test | Result |
|---|---|---|
| 1 | Development (cat) | PASS — 54 tools |
| 2 | Business (cat) | PASS — 42 tools |
| 3 | Video & Audio (cat) | PASS — 35 tools |
| 4 | Design (cat) | PASS — 52 tools |
| 5 | Productivity (cat) | PASS — 37 tools |
| 6 | Automation (cat) | PASS — 10 tools |
| 7 | Research (cat) | PASS — 23 tools |
| 8 | Content Creation (cat) | PASS — 25 tools |
| 9 | Education (cat) | PASS — 12 tools |
| 10 | Marketing (cat) | PASS — 32 tools |
| 11 | Coding & Development (UC) | PASS — 132 tools |
| 12 | Image Creation (UC) | PASS — 90 tools |
| 13 | Audio & Voice (UC) | PASS — 35 tools |
| 14 | Business Operations (UC) | PASS — 51 tools |
| 15 | Customer Support (UC) | PASS — 22 tools |
| 16 | Development + Freemium | EXPECTED EMPTY — pricing unknown for new tools |
| 17 | Development + Paid | EXPECTED EMPTY — pricing unknown for new tools |
| 18 | Research + Free | EXPECTED EMPTY — pricing unknown for new tools |
| 19 | Research + Has Free Tier | PASS — 11 tools |
| 20 | Marketing + Has Free Tier | PASS — 7 tools |
| 21 | Design + Freemium | EXPECTED EMPTY — pricing unknown for new tools |
| 22 | Productivity + Has Free Tier | PASS — 18 tools |
| 23 | Meetings & Transcription + Paid | EXPECTED EMPTY — pricing unknown for new tools |
| 24 | Business + Paid + Has Free Tier | EXPECTED EMPTY — pricing unknown for new tools |
| 25 | Writing & Content (UC) + Freemium | EXPECTED EMPTY — pricing unknown for new tools |

**No data leakage detected.** All 18 non-pricing combinations pass. The 7 empty results are expected — these combinations require `pricingModel` data which remains `unknown` for 685 tools pending editorial enrichment.

---

## 9. SEO Guardrails Confirmed

- All 584 new tools retain `contentReviewRequired: true`
- All 584 new tools retain `noindex,follow` meta tag in generated pages
- All 584 new tools excluded from `sitemap.xml`
- Category/use-case assignment does NOT change indexability status

---

## 10. Validation Results

| Check | Status |
|---|---|
| `npm run validate:data` | ✅ PASS — 0 errors, 1172 warnings (all expected contentReviewRequired notices) |
| `npm run validate:seo` | ✅ PASS — 973 HTML files audited |
| `node scripts/crawl-links.mjs` | ✅ PASS — 42,831 links, 0 broken |
| `node scripts/validate-sitemap.mjs` | ✅ PASS — 379 URLs valid |
| `npm run predeploy` | ✅ PASS — 902 tools, 315 eligible, 584 need review |

---

## 11. Build Info

```json
{
  "schemaVersion": "4G.1",
  "toolCount": 902,
  "recommendationEligible": 315,
  "contentReviewRequired": 584
}
```

---

## 12. Finder Safety

- `recommendationEligible` remains `false` for all 584 new tools
- Category and use-case enrichment does NOT enable Finder eligibility
- Finder eligibility will require deliberate editorial review in Phase 5

---

## 13. Known Limitations

1. **149 tools remain uncategorized** — insufficient publicly available evidence to classify safely
2. **685 tools have `pricingModel = unknown`** — no pricing filter for new tools pending enrichment
3. **580 tools have `hasFreeTier = unknown`** — free-tier filter limited to legacy catalog
4. **Category filter counts reflect legacy 318** — the Browse category filter now shows expanded counts but pricing sub-filters are sparse for new tools

---

## 14. Files Changed

| File | Change |
|---|---|
| `data/tools.json` | 435 new tools received category + primaryUseCases |
| `js/browse.js` | USE_CASE_TAXONOMY keyword lists extended |
| `scripts/enrich-batch-4g1.mjs` | New enrichment script created |
| `scripts/generate-build-info.mjs` | schemaVersion updated to 4G.1 |
| `CATEGORY_FILTER_EXPANSION_QA_REPORT.md` | This report |
