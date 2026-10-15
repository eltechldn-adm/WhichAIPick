---
name: whichaipick-catalogue-qa
description: Validates WhichAIPick AI tool catalogue records, official URLs, pricing, descriptions, evidence, eligibility, categories and lifecycle status. Use for catalogue imports, tool updates, Finder and Quiz data reviews, comparisons or data integrity audits.
---

# WhichAIPick Catalogue QA

## Purpose

Protect the accuracy and consistency
of the WhichAIPick AI tool catalogue.

Follow Master Control Directive v2.0.

READ-ONLY by default.

Never invent product information.

## 1. Establish Data Source

Identify:

- Current Git branch
- Dataset path
- Dataset version
- Record count
- Relevant import contract
- Evidence ledger

Do not assume different branches use
identical catalogue versions.

## 2. Record Integrity

Check:

- Unique IDs
- Unique slugs
- Required fields
- Valid categories
- Description availability
- Website URLs
- Record relationships
- Lifecycle statuses

Report missing or inconsistent data.

## 3. Product Identity

Check that each listing represents
the intended product or service.

Identify:

- Duplicate listings
- Rebranded products
- Acquired products
- Discontinued services
- Historical features
- Successor relationships

Do not automatically remove or
restore catalogue records.

## 4. Official Website URLs

Verify URLs against authoritative
vendor sources when available.

Distinguish:

- Official website
- Documentation website
- Product landing page
- Affiliate destination
- Unverified third-party domain

HTTP 200 alone is insufficient to
prove a destination is official.

Do not invent replacement URLs.

## 5. Pricing Verification

Check:

- Pricing model
- Free tier
- Free trial
- Starting price
- Currency
- Billing period
- Enterprise pricing
- Evidence review date

Do not treat unverified prices
as current verified prices.

Use UNKNOWN when necessary.

Do not invent subscription prices.

## 6. Eligibility Integrity

Inspect the actual implementation of:

directoryEligible

recommendationEligible

seoEligible

contentReviewRequired

Determine the real meaning of each
field from the existing project code.

Do not assume the fields are equivalent.

Check that Finder and Quiz only recommend
tools permitted by the applicable rules.

Informational catalogue inclusion
does not imply recommendation eligibility.

## 7. Finder and Quiz Compatibility

Verify:

- Tool IDs
- Categories
- Use-case mappings
- Eligibility filtering
- Pricing filters
- Search terms
- Comparison data
- Legacy product aliases

Do not alter ranking logic without
explicit authorisation.

## 8. Evidence Integrity

For factual claims, record:

- Source URL or evidence ID
- Source type
- Verification date
- Supported claim
- Review status

Use classifications:

VERIFIED CURRENT

VERIFIED HISTORICAL

OUTDATED

UNSUPPORTED

NOT CHECKED

An evidence ID alone does not prove
that a claim is still current.

## 9. Catalogue Counts

Determine counts from the actual source.

For the current Phase 11 contract,
882 records are the documented baseline.

Historical documentation references
902 records before reconciliation.

Do not automatically add missing
historical records.

Do not silently change record counts.

Reconcile differences using evidence.

## 10. Validation Commands

Inspect package.json before running tests.

Use relevant existing commands,
such as:

npm run catalog:phase11:validate

npm run validate:data

Only execute commands confirmed to exist.

Prefer read-only validation.

Do not run imports or generation scripts
that overwrite datasets without approval.

## 11. Final Report

Return:

1. Dataset and branch
2. Record counts
3. Duplicate IDs
4. Missing information
5. Product lifecycle findings
6. URL verification
7. Pricing verification
8. Eligibility results
9. Finder/Quiz compatibility
10. Evidence quality
11. Validation results
12. Outstanding defects
13. Final decision

Use:

PASS
CONDITIONAL PASS
FAIL
BLOCKED
NOT TESTED

Never declare PASS without evidence.

Catalogue QA approval is not
production deployment authorisation.
