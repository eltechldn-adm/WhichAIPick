# Discovery Engine 2.0 — Migration Notes

Context for Phase 6D. Written during Phase 6B.3B. Nothing in this document has been implemented in `/find`.

## 1. Two recommendation engines now exist

| | Legacy Finder (`js/find.js`) | Comparison Centre (`js/decision-engine.js`) |
|---|---|---|
| Dataset | Finder / full catalogue data | `data/comparison-index.json` (882 records) |
| Method | Additive numeric score, top 3 | Lexicographic criteria, no numeric score |
| Goal | Finder intents, hard relevance floor | `finderIntentIds` → `primaryUseCases` → `primaryCategory`, hard relevance floor |
| Free plan | `hard_free` / `soft_free` (score adjustment) | Hard constraint; `null` = UNKNOWN and excluded |
| Technical needs | Specialist boost (soft) | API / open source / self-hosted are hard constraints |
| Experience | Not a Finder question | Soft preference (ordering only) |
| Eligibility | `recommendationEligible`, `contentReviewRequired`, discontinued lifecycle, `successorToolId` | `recommendationEligible === true`, `directoryEligible`, `operationalStatus`, lifecycle, `successorToolId`, alias records |
| Null semantics | Boolean coercion in places | Explicit: CONFIRMED MATCH / MISMATCH / UNKNOWN / NOT APPLICABLE |
| Labels | Legacy question labels | Canonical `INTENT_LABELS` |

## 2. Known inconsistencies to resolve

1. **Scoring vs. lexicographic ordering.** Legacy scores can rank a tool above one that satisfies more confirmed requirements. 6D should pick one model.
2. **Null handling.** Legacy treats missing free-tier data differently from the decision engine.
3. **`contentReviewRequired`.** Checked by Finder only; the field is not exported to the comparison index. 6D needs one eligibility definition at export time.
4. **Soft vs. hard free-plan wording.** Finder's `soft_free` has no direct decision-engine equivalent (the engine's "happy to pay" option adds no preference).
5. **Intent labels.** Finder questions and `INTENT_LABELS` are maintained separately.
6. **Compatibility model.** `getCompatibilityLevel` (comparison-core) has no Finder equivalent.

## 3. Proposed target architecture

- One pure engine module with: `evaluateCriterion`, `evaluateTool`, `discoverMatchingTools`, `buildExplanationModel`.
- One eligibility predicate (`isProactivelyEligible`) shared by `/find`, Compare discovery and any future surfaces.
- One lean, build-generated index (extend `comparison-index.json`, do not load the full catalogue in the browser).
- Hard constraints = confirmed data only. Soft preferences affect ordering only.
- No global score, no popularity, no monetisation inputs. Guard-enforced.
- Explanations generated from the same evaluation result that produced the ordering.

## 4. Rules to preserve

- Unknown never satisfies a hard requirement and is never silently treated as false.
- Selected / manually compared tools may include restricted records; proactive results never do.
- Discovery state is ephemeral; it never creates indexable URLs or sitemap entries.
- Analytics carry canonical IDs and counts of results only, never internal ordering values.

## 5. Out of scope for 6B.3B

Replacing `/find`, merging datasets, adding new SEO pages, adding new question types.
