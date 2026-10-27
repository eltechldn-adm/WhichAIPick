# PHASE 6C.0B — CANONICAL TOOL PAGE 2.0 DATA CONTRACT

## A. Purpose
To define the authoritative data contract for Tool Page 2.0, establishing strict rules for null semantics, schema mapping, legacy content fallbacks, indexability, and evidence-backed presentation.

## B. Current pipeline
The current build pipeline operates as follows:
1. **Source of Truth**: `Phase 11 workbook`
2. **Staged Canonical Output**: `import-phase11-workbook.mjs` generates `data/tools.phase11.staged.json`
3. **Lean Comparison Index**: Generated from the staged output to `data/comparison-index.json`
4. **Build Compatibility File**: `tools.phase11.staged.json` is copied to `data/tools.json`
5. **Page Generator**: `generate-static-pages.mjs` consumes `tools.json`

Currently, `tools.json` acts as a legacy compatibility layer where canonical Phase 11 fields and legacy editorial enrichment are merged into a single record before rendering, obscuring data provenance.

## C. Source authority hierarchy

### LEVEL A — CANONICAL FACT
Originates directly from the Phase 11 canonical catalogue data.
Examples: `id`, `canonicalName`, `primaryCategory`, `pricingModel`, `hasFreeTier`, `hasFreeTrial`, `startingPrice`, `priceCurrency`, `bestFor`, `notIdealFor`, `primaryUseCases`, `platforms`, `experienceLevel`, `apiAvailable`, `openSource`, `selfHosted`, `directoryEligible`, `recommendationEligible`, `operationalStatus`, `lifecycleStatus`, `successorToolId`, `aliases`.

### LEVEL B — EVIDENCE / PROVENANCE
Supports trust/freshness UI and data-quality decisions.
Examples: `evidenceIds`, `verificationSources`, `fieldProvenance`, `dataProvenance`, `pricingNeedsReview`, `metadataReviewRequired`, `categoryReviewRequired`, `contentReviewRequired`, review dates.

### LEVEL C — LEGACY EDITORIAL ENRICHMENT
Historical prose and manually authored content. MUST NOT automatically be considered verified canonical facts.
Examples: `affiliate_url`, `tags`, `how_it_works`, `workflows`, `feature_groups`, `pros`, `cons`, `pricing_overview`, `comparison_summary`, `long_description`.

### LEVEL D — DERIVED PRESENTATION
Determined deterministically from Levels A–C at build or runtime.
Examples: pricing badges, display labels, formatted platform names, comparison CTAs, schema fields, metadata strings, breadcrumbs, freshness labels.

## D. Canonical fields

| Field | Source | Authority level | Type | Nullable? | Meaning of null | Safe to display? | Safe for schema? | Needs evidence? | Legacy fallback allowed? | Tool Page 2.0 section |
|---|---|---|---|---|---|---|---|---|---|---|
| `id` | Catalog | A | String | No | N/A | Yes (internal) | No | No | No | N/A |
| `canonicalName` | Catalog | A | String | No | N/A | Yes | Yes | Yes | No | Hero, Metadata |
| `primaryCategory` | Catalog | A | String | No | N/A | Yes | Yes | Yes | No | Hero, Breadcrumbs |
| `website_url` | Catalog | A | String | Yes | No known official site | Yes | Yes | Yes | No | CTA, Schema |
| `pricingModel` | Catalog | A | Enum | Yes | Model not verified | Yes | Yes | Yes | No | Quick facts, Pricing |
| `hasFreeTier` | Catalog | A | Boolean| Yes | Free tier not confirmed | Yes | Yes | Yes | No | Quick facts, Pricing |
| `hasFreeTrial` | Catalog | A | Boolean| Yes | Trial not confirmed | Yes | No | Yes | No | Quick facts, Pricing |
| `startingPrice` | Catalog | A | Number | Yes | Price not verified/public | Yes | Yes | Yes | No | Pricing |
| `priceCurrency` | Catalog | A | String | Yes | Currency not known | Yes | Yes | Yes | No | Pricing |
| `paidPlanAvailable`| Catalog | A | Boolean| Yes | Paid plan not confirmed | Yes | No | Yes | No | Pricing |
| `bestFor` | Catalog | A | Array | Yes | No specific best use cases | Yes | No | Yes | Yes | Best for |
| `notIdealFor` | Catalog | A | Array | Yes | No specific exclusions | Yes | No | Yes | Yes | Not ideal for |
| `primaryUseCases` | Catalog | A | Array | Yes | Use cases not verified | Yes | No | Yes | No | Use cases |
| `platforms` | Catalog | A | Array | Yes | Platforms not confirmed | Yes | Yes | Yes | No | Quick facts, Platforms |
| `experienceLevel` | Catalog | A | Enum | Yes | Level not classified | Yes | No | Yes | No | Quick facts |
| `apiAvailable` | Catalog | A | Boolean| Yes | API not confirmed | Yes | No | Yes | No | Tech capabilities |
| `openSource` | Catalog | A | Boolean| Yes | Open source not confirmed | Yes | No | Yes | No | Tech capabilities |
| `selfHosted` | Catalog | A | Boolean| Yes | Self hosting not confirmed| Yes | No | Yes | No | Tech capabilities |
| `aliases` | Catalog | A | Array | Yes | No known aliases | Yes | Yes | Yes | No | Metadata, Search |
| `operationalStatus`| Catalog | A | Enum | No | N/A | Yes | No | Yes | No | Hero (warnings) |
| `lifecycleStatus` | Catalog | A | Enum | No | N/A | Yes | No | Yes | No | Hero (warnings) |
| `successorToolId` | Catalog | A | String | Yes | No known successor | Yes | No | Yes | No | Hero (redirects) |
| `recommendationEligible`| Catalog | A | Boolean| No | N/A | No (internal)| No | Yes | No | Compare/Discovery |
| `directoryEligible`| Catalog | A | Boolean| No | N/A | No (internal)| No | Yes | No | Indexing |
| `seoEligible` | Catalog | A | Boolean| No | N/A | No (internal)| No | Yes | No | Indexing |
| `contentReviewRequired`| Catalog | B | Boolean| No | N/A | No (internal)| No | Yes | No | Indexing |
| `pricingNeedsReview`| Catalog | B | Boolean| No | N/A | No (internal)| No | Yes | No | Internal only |
| `metadataReviewRequired`|Catalog| B | Boolean| No | N/A | No (internal)| No | Yes | No | Internal only |
| `verificationSources`| Catalog| B | Array | Yes | No sources recorded | No (internal)| No | Yes | No | Internal only |
| `evidenceIds` | Catalog | B | Array | Yes | No evidence recorded | No (internal)| No | Yes | No | Freshness computation |
| `dataProvenance` | Catalog | B | Object | Yes | Provenance unknown | No (internal)| No | No | No | Internal only |
| `fieldProvenance` | Catalog | B | Object | Yes | Provenance unknown | No (internal)| No | No | No | Internal only |
| `affiliate_url` | Legacy | C | String | Yes | No affiliate link | Yes (URL) | No | No | Yes | CTA |
| `how_it_works` | Legacy | C | String | Yes | No editorial prose | Yes (Prose) | No | No | Yes | How it works |
| `workflows` | Legacy | C | Array | Yes | No editorial workflows | Yes | No | No | Yes | Workflows |
| `feature_groups` | Legacy | C | Array | Yes | No editorial features | Yes | No | No | Yes | Key features |
| `pros` | Legacy | C | Array | Yes | No editorial pros | Yes | No | No | Yes | Strengths |
| `cons` | Legacy | C | Array | Yes | No editorial cons | Yes | No | No | Yes | Limitations |
| `pricing_overview` | Legacy | C | String | Yes | No editorial pricing | Yes | No | No | Yes | Pricing |
| `comparison_summary`| Legacy | C | String | Yes | No editorial summary | Yes | No | No | Yes | Compare |
| `long_description` | Legacy | C | String | Yes | No legacy description | Yes | Yes (desc)| No | Yes | Summary |

## E. Legacy enrichment policy
Canonical field exists → use canonical.
Canonical field = null → do NOT automatically overwrite with legacy factual claim.
Legacy editorial content → may be displayed only as editorial context (with a visual separation or label if presenting capabilities).

## F. Null semantics
The contract explicitly preserves:
- `false` ≠ `null`
- `0` ≠ `null`
- `[]` ≠ `null`
- `""` ≠ `null`

For Boolean fields:
- `true`: confirmed yes
- `false`: confirmed no
- `null`: not confirmed / unknown (Must NOT render as a confirmed negative).

## G. Array null semantics
The current `import-phase11-workbook.mjs` script coerces `null` to `[]` for JSON fields (`primaryUseCases`, `platforms`, `aliases`, `verificationSources`, `finderIntentIds`, `deploymentModes`, `useCaseIds`, `audienceTags`, `evidenceIds`, `recurringFreeIntentIds`, `dataProvenance`, `fieldProvenance`, `bestFor`, `notIdealFor`). 

This destroys the semantic distinction between:
- `null`: Platform/use case unknown.
- `[]`: Confirmed to have NO supported platforms/use cases.
This coercion must be removed in future iterations of the importer to maintain contract integrity.

## H. Pricing contract
- Pricing distinguishes: `hasFreeTier`, `hasFreeTrial`, `pricingModel`, `startingPrice`, `priceCurrency`, `paidPlanAvailable`, `pricingNeedsReview`.
- explicitly PREVENT: `hasFreeTier=true` → schema `price: '0'` (unless startingPrice is genuinely 0 or free is the only plan).
- explicitly PREVENT: `startingPrice=null` → "Free" or "Contact sales" (Must render as "Pricing not verified" or omit).

## I. Platform contract
The `platforms` canonical field must drive platform display (e.g. `web`, `windows`, `macos`, `linux`, `ios`, `android`, `cli`, `api`). 
- Do NOT hardcode `operatingSystem: "Web"` for all tools. 
- Map `windows` → `Windows`, `macos` → `macOS`. 
- If platform info cannot map safely to Schema.org `operatingSystem` (e.g., `api`, `cli`), omit the `operatingSystem` property in the schema. Do not invent unsupported OS values.

## J. Schema contract
| Property | Canonical source | Conditions required | Fallback | Omit condition |
|---|---|---|---|---|
| `SoftwareApplication.name`| `canonicalName` | None | None | Never |
| `applicationCategory` | `primaryCategory` | None | "BusinessApplication" | If missing |
| `operatingSystem` | `platforms` | Resolvable to OS | None | If `platforms` lacks OS |
| `url` | `website_url` | None | None | If missing |
| `description` | `long_description` | None | `sourceSummary` | If missing |
| `offers` | `startingPrice`/`Currency` | `startingPrice` is number | None | If `startingPrice` is null |
| `publisher` | `canonicalName` | None | None | Never |

No rating schema. No review schema. No fake price. No unsupported availability.

## K. Editorial-content policy
- `long_description`: REVIEW BEFORE DISPLAY (Migrate to structured summary + verified data).
- `how_it_works`: KEEP WITH LABEL (Identify as editorial prose).
- `pros`: NEEDS EVIDENCE / REVIEW BEFORE DISPLAY.
- `cons`: NEEDS EVIDENCE / REVIEW BEFORE DISPLAY.
- `pricing_overview`: REVIEW BEFORE DISPLAY (Transition to structured pricing tables).
- `comparison_summary`: KEEP WITH LABEL.
- `feature_groups`: REWRITE FROM VERIFIED DATA.
- `workflows`: KEEP AS-IS.

## L. Recommendation restrictions
Tools with `recommendationEligible: false` (e.g. `amazon-codewhisperer`, `appgyver`):
- **What page can show**: Standard tool page facts, features, and capabilities.
- **What discovery can do**: Include the tool in relevant category filters as an option.
- **What recommendation UI must not do**: MUST NOT proactively present the tool as a "Best For X" winner, featured alternative, or "WhichAIPick Recommends" selection.

## M. Indexability policy
Indexability for Tool Page 2.0 should be an explicit decision model:
- `seoEligible` represents whether the tool possesses enough commercial/search volume to justify a dedicated organic landing page.
- `seoEligible=false` DOES NOT mean `noindex`. A tool may still be indexed if `directoryEligible=true` and `contentReviewRequired=false` to support long-tail directory discovery.
- `noindex` should be applied when `criticalHold=true` or `contentReviewRequired=true`.

## N. Evidence/trust contract
- `evidenceIds` map directly to records in `phase11-evidence-ledger.json`.
- Trust UI may surface "Evidence reviewed on [Date]" only when `evidenceReviewedAt` exists.
- Explicitly FORBID unsupported claims like "Pricing verified" (unless verified), "Tested by WhichAIPick", or "Independently tested" without dedicated evidence.

## O. Affiliate separation
Affiliate data (`affiliate_url`) MUST NEVER influence page factual claims, dynamic alternatives, recommendations, comparison rankings, or discovery rankings. It is strictly for commercial presentation (e.g., CTA routing).

## P. ToolPageViewModel proposal
```typescript
interface ToolPageViewModel {
    identity: { id, canonicalName, aliases, websiteUrl };
    classification: { primaryCategory, useCases, bestFor, notIdealFor };
    pricing: { model, hasFreeTier, hasFreeTrial, startingPrice, currency };
    capabilities: { apiAvailable, openSource, selfHosted };
    platforms: { supported: string[] };
    audience: { targetUsers, experienceLevel };
    editorial: { summary, howItWorks, pros, cons, workflows };
    trust: { evidenceReviewedAt, verificationSourcesCount };
    eligibility: { recommendationEligible, directoryEligible, seoEligible };
    relationships: { successorToolId };
    commercial: { affiliateUrl };
    seo: { robotsMeta, canonicalUrl, schemaLd };
}
```

## Q. Recommended generator input
**Option A (`data/tools.phase11.staged.json`)** is recommended.
It provides canonical authority, preserves explicit null semantics before legacy destruction, ensures build determinism, and establishes a clean boundary between Phase 11 verified data and unstructured legacy text.

## R. Six fixture walkthroughs

| Fixture | Canonical Facts Usable | Unknown Fields | Legacy Editorial | Schema-Safe | Trust Data | Recommendation | Rendering Highlights |
|---|---|---|---|---|---|---|---|
| **chatgpt** | Fremium, Web/iOS/Android | `startingPrice`, `hasFreeTrial` | `long_description`, `how_it_works` | Valid | Freshness dates | `true` | Full page, OS: Web/Android/iOS |
| **midjourney** | Paid, Web/Discord | `hasFreeTrial` | `long_description`, `how_it_works` | Omit `operatingSystem` | Freshness dates | `true` | Full page |
| **cursor** | Freemium, Web/Mac/Win/Linux/CLI/API | `hasFreeTrial` | `long_description`, `how_it_works` | Valid (Desktop OS) | Freshness dates | `true` | Full page, developer specs visible |
| **zapier-ai** | Freemium, Web/API | `startingPrice` | `long_description`, `how_it_works` | Omit `operatingSystem` | Freshness dates | `true` | Hide featured comparisons |
| **aider** | Free, Mac/Win/Linux/CLI, OSS | `startingPrice`, `hasFreeTrial` | `long_description` | Valid (Desktop OS) | Freshness dates | `true` | Hide HowItWorks/Features, show capabilities |
| **amazon-codewhisperer** | Freemium, Web | `startingPrice`, `hasFreeTrial` | `long_description`, `how_it_works` | Valid | Freshness dates | **`false`** | Full page, hide from recommendations |

## S. Migration implications
- The array coercion logic in `import-phase11-workbook.mjs` must be updated to preserve `null` for JSON fields instead of coercing to `[]`.
- `generate-static-pages.mjs` must be rewritten to consume `tools.phase11.staged.json` and map fields according to the ToolPageViewModel contract.

## T. Open decisions for external review
1. Should `operatingSystem` be omitted entirely in Schema.org JSON-LD if the platform is strictly `api` or `discord`?
2. How should we visually differentiate legacy `pros`/`cons` from newly verified capability limitations?
3. Should tools with `seoEligible=false` receive a `<meta name="robots" content="noindex, follow">` despite being directory-eligible, to conserve crawl budget?
4. How should the frontend handle `amazon-codewhisperer`'s display name vs its `Amazon Q Developer` canonical rebrand?
5. Do we want a visual warning banner for tools where `lifecycleStatus` is `deprecated` or `sunset`?
6. Should zero-price `Offer` schemas be injected if `pricingModel === 'free'` but `startingPrice` is technically null?
7. How should we display "Free Trial" if it exists but the duration (days) is unknown?
8. Should `experienceLevel` be surfaced in the Hero section or relegated to Quick Facts?
9. Should `verificationSources` counts be displayed to the user as a trust signal?
10. If `website_url` is null, should the primary CTA be disabled or routed to a search page?
