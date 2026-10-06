# Phase 6B.3B — Catalogue-Wide Comparison Discovery Report

## A. Starting SHA
`18142b0de1ef59703eeb6e57ae2dfb8a3f58f2d3` (safety tag `comparison-centre-pre-6b3b`, pushed).

## B. Architecture
`DecisionEngine.discoverMatchingTools({ tools, preferences, excludeIds, limit, selectedTools })` in `js/decision-engine.js`. Pure, no HTML. It reuses `evaluateCriterion` / `evaluateTool`, so goal, experience, budget, technical and null semantics are identical to Help Me Decide. Returns `MATCHES FOUND`, `NO MATCHES FOUND` or `INSUFFICIENT SCOPE`, plus `{ tool, matches, mismatches, unknowns }` per result. UI in `js/decision-assistant.js`; styles in `css/pages/decision-assistant.css`. Data: the in-memory `comparison-index.json` already loaded by the assistant (no extra fetch, no `tools.json`).

## C. Discovery pool
882 records → 879 `recommendationEligible`. Excluded: `amazon-codewhisperer`, `appgyver`, `descript-overdub`, plus the currently selected tools.

## D. Eligibility rules
`recommendationEligible === true`; `directoryEligible === true` (when present); `operationalStatus` active; lifecycle not discontinued/retired/defunct/shutdown/redirect; no `successorToolId`; id is not an alias of another record. Catalogue note: the 35 `rebranded`/`acquired` records have `operationalStatus: active` and no successor link, so they are current canonical records and remain eligible.

## E. Goal relevance floor
A real goal is required: `finderIntentIds` (tier 0), then `primaryUseCases` (tier 1), then `primaryCategory` (tier 2). Non-matching goals are excluded regardless of budget/technical fit. "No preference" goal uses the intents shared by all selected tools; if there are none, the result is `INSUFFICIENT SCOPE` ("Choose a goal to discover other matching tools.").

## F. Hard constraints
Confirmed free plan, API, open source and self-hosting require the field to be `true`. `false` and `null` are excluded. "Happy to pay" adds no constraint and no preference.

## G. Experience preference
Soft only. Exact match and `all_levels` count as matches; an explicit mismatch counts as a mismatch and ranks lower, but is not excluded. "No preference" is ignored.

## H. Ordering rules
Lexicographic and deterministic: (1) goal tier, (2) fewer confirmed mismatches, (3) more confirmed matches, (4) fewer unknown fields, (5) canonical id. No popularity, brand, or monetisation inputs. No numeric score is computed, shown or logged.

## I. Null semantics
`null` stays `UNKNOWN` in evaluation. For hard requirements, UNKNOWN cannot satisfy them, so the candidate is excluded. For soft criteria (experience) it is shown as "not confirmed".

## J. Explanation model
Each card shows "Why it matches" (goal, experience, free plan, technical, all confirmed) and "Trade-offs / not confirmed" only when relevant. Copy avoids quality claims ("Another option…", "matches your selected requirements").

## K. UI integration
Opt-in button "Explore other matching tools" after Help Me Decide results. Heading "Other tools matching your requirements" (distinct from the editorial "Alternatives"). Default 3 cards; "Show 3 more" up to 6. Transparency copy links to `/review-methodology`. Empty state offers Change my answers / Remove a requirement / Back to comparison. Open/close never touches the hash.

## L. Add/replace behaviour
Under 4 tools: "Add to comparison" → `CompareEngine.addTool(id)`, assistant then closes. At 4 tools: no add button; "View tool", "Replace a tool" (inline list of four `Replace X` buttons → `CompareEngine.replaceTool`), and "Start a new comparison". "View tool" links to `/tools/{id}/`.

## M. Recommendation restrictions
Engine-level guard; tested with synthetic perfect matches and all three real restricted records across all of their intents.

## N. Affiliate neutrality
Engine and assistant sources contain no reference to affiliate/monetisation/sponsor/commission/popularity/score; this is asserted by the guard.

## O. Accessibility
Semantic `h3`/`h4`, `article` cards, labelled CTAs, `aria-expanded`/`aria-controls` on the discover, replace and show-more toggles, persistent polite live region for result announcements, no focus theft, visible focus rings.

## P. Performance
Average discovery over 879 records ≈ 0.2 ms (guard threshold 50 ms). No additional network request.

## Q. Unit tests
`scripts/qa/decision-discovery-guard.mjs` covers: counts (882/879/3), excluded IDs, three restricted tools, goal floor, free/API/open-source/self-hosted hard constraints (true/false/null), experience ordering, intent > use-case > category, lifecycle/alias/directory filtering, determinism, order invariance, limit, no-preference scope, XSS, affiliate scan, sitemap, perf. `decision-assistant-guard.mjs` fixed: `zapier-ai` is now required (no silent skip) and ChatGPT + Claude is asserted as `Partial overlap`.

## R. Real catalogue tests
- image.generate + free plan (excluding midjourney, leonardo-ai): adobe-firefly, bluewillow, canva-ai, craiyon, creatify, cutout-pro — all eligible, goal-relevant, `hasFreeTier=true`.
- coding.code_generation + self-hosting: aider, cline, cursor, gitlab-duo, kilo, opencode — all `selfHosted=true`.
- sales.outreach + free + self-hosting: `NO MATCHES FOUND`, zero results.
- CodeWhisperer-style strong match: not present.

## S. Existing Finder relationship
Not changed. Differences are documented in `DISCOVERY_ENGINE_2_MIGRATION_NOTES.md` for Phase 6D.

## T. Full regression
`catalog:phase11:validate`, editorial guard, curated page guard (8 pages), decision assistant guard, discovery guard, `npm run qa`, `build:cloudflare`, `validate-finder-phase3` all pass. Sitemap: 959 URLs, 0 added. Local browser QA (1366px, 320/375px): discovery cards, Show 3 more, add (2→3→4 tools), 4-tool replace flow, self-host flow, hash preserved, no overflow, no console errors.

## U. Cloudflare Preview
Initial QA on Cloudflare Preview (`be4bbdc2.whichaipick.pages.dev`) revealed an integration bug on curated pages: `window.CompareEngine` was missing, causing the "Add to comparison" CTA to fail silently. 
This has been resolved by implementing a navigation fallback in `js/decision-assistant.js`. If `window.CompareEngine` is missing (i.e. on curated pages), the discovery buttons now navigate the user to the dynamic compare page (`/compare#tools=...`) preserving the context and selection. 
Local Browser QA was re-run successfully against these fixes.

## V. Remaining blockers
None known. Optional items not built: `/compare` hub hint (§33) and per-card "Compare with [selected tool]" secondary CTA (§31).
