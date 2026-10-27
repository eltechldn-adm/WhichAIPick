---
name: whichaipick-technical-seo
description: Audits WhichAIPick technical SEO, canonical URLs, sitemap integrity, indexing directives, redirects and structured data. Use when reviewing page generation, catalogue SEO, search visibility or Cloudflare deployments.
---

# WhichAIPick Technical SEO

## Purpose

Audit technical SEO without introducing
unapproved website modifications.

Follow Master Control Directive v2.0.

This skill is READ-ONLY by default.

## 1. Identify Environment

Before auditing:

- Identify current Git branch.
- Identify the target deployment.
- Identify the intended SEO configuration.
- Identify the relevant catalogue.
- Identify whether the environment is
  production, development or preview.

Do not confuse development output
with production output.

## 2. Metadata

Inspect relevant pages for:

- Unique descriptive title
- Meta description
- Canonical URL
- Robots directives
- Appropriate heading hierarchy
- Open Graph metadata

Report missing or invalid metadata.

Do not fabricate descriptions.

## 3. Canonical URLs

Verify canonical URLs resolve to
appropriate public destinations.

Preserve existing production slugs.

Flag:

- Invalid canonical URLs
- Duplicate canonical conflicts
- Preview-domain canonical leakage
- Canonicals pointing to missing pages

Do not automatically change canonical URLs.

## 4. Sitemap

Inspect the existing sitemap generator.

Use actual catalogue eligibility rules.

Verify:

- Sitemap XML validity
- Correct public URLs
- Appropriate indexability
- No unexpected removed pages
- No preview URLs
- No unintended duplicates

Do not hardcode sitemap URL counts.

Determine expected counts from the
actual branch and generated output.

## 5. Structured Data

Verify existing JSON-LD.

Check:

- Valid JSON
- Appropriate schema types
- Accurate product information
- No fabricated ratings
- No unsupported pricing
- No misleading review claims

Do not invent schema attributes.

## 6. Indexing Protection

For production:

Check indexing directives and canonical URLs
against approved project policy.

For preview:

Verify noindex protection.

Inspect actual HTTP headers where possible.

Do not assume a meta tag alone is sufficient.

Never expose staging content as indexable
without explicit authorisation.

## 7. Redirects

Inspect existing redirect configuration.

Check:

- Redirect destinations
- Redirect loops
- Legacy tool URL compatibility
- Rebranded product destinations
- Broken or unexpected redirects

Do not create redirects automatically.

## 8. Catalogue SEO

Verify that SEO generation respects:

- directoryEligible
- recommendationEligible
- seoEligible
- contentReviewRequired

Determine how each field is actually used
by the current repository code.

Do not assume these fields are interchangeable.

Do not modify eligibility flags.

Use the current authoritative catalogue.

## 9. Content Quality

Flag potential:

- Thin content
- Duplicated descriptions
- Outdated pricing
- Unsupported product claims
- Misleading historical product descriptions
- Repetitive programmatic pages

Distinguish technical validation
from editorial verification.

Do not claim search ranking or AdSense
approval is guaranteed.

## 10. Run Existing Tests

Check package.json before execution.

Relevant commands may include:

npm run validate:seo

npm run validate:sitemap

npm run audit:schema

Use only commands confirmed to exist.

Prefer non-destructive validation.

Do not run build commands that rewrite
generated files without explicit approval.

Record:

- Tests executed
- Results
- Errors
- Warnings
- Tests not executed

Never report untested checks as PASS.

## 11. Final Report

Return:

1. Target branch/environment
2. Metadata findings
3. Canonical URL findings
4. Sitemap results
5. Structured data results
6. Indexing protection
7. Redirect findings
8. Catalogue SEO integrity
9. Content quality concerns
10. Tests executed
11. Outstanding issues
12. Final decision

Severity:

P0 — Critical
P1 — High
P2 — Medium
P3 — Low

Final status:

PASS
CONDITIONAL PASS
FAIL
BLOCKED

Provide evidence for every PASS.

A successful SEO audit does not
authorise production deployment.
