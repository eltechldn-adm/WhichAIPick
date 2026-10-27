---
name: whichaipick-code-review
description: Reviews WhichAIPick application code, static-site generators, frontend JavaScript, CSS, build scripts and QA changes. Use for pull request reviews, implementation reviews, regression analysis and phase acceptance checks.
---

# WhichAIPick Code Review

## Purpose

Review proposed code changes before
acceptance or release.

Follow MCD v2.0.

This skill is READ-ONLY by default.

## 1. Establish Scope

Identify:

- Target branch and commit
- Intended change
- Files modified
- Expected behaviour
- Protected components

Do not assume the current branch
is the intended release candidate.

## 2. Inspect the Diff

Review actual changed lines.

Look for:

- Logic errors
- Broken imports
- Missing dependencies
- Invalid HTML
- Unsafe DOM insertion
- Broken event handlers
- Inaccessible controls
- Incorrect links
- Unintended CSS changes
- Unsupported product claims
- Unnecessary dependencies
- Changes outside approved scope

Do not invent findings.

## 3. Architecture Review

Confirm compatibility with:

- Existing static-site architecture
- Node.js generation scripts
- Cloudflare Pages
- Existing catalogue contracts
- Existing design system
- Existing routing
- Existing SEO implementation

Do not recommend introducing a
framework without explicit approval.

## 4. Data Integrity

Check that changes preserve:

- Tool IDs
- Categories
- Recommendation eligibility
- Directory eligibility
- Pricing semantics
- Evidence provenance

Do not fabricate catalogue values.

## 5. Security Review

Check:

- HTML escaping
- Injection risks
- External link attributes
- Secret exposure
- Unsafe dependencies
- Accidental public debug output

Do not expose secrets in reports.

## 6. Regression Verification

Inspect package.json for available
test and validation commands.

Choose tests relevant to the change.

Do not assume commands exist.

Avoid running destructive commands.

Distinguish:

- Tests executed successfully
- Tests that failed
- Tests not executed
- Tests unavailable

Do not mark NOT TESTED as PASS.

## 7. Branch Awareness

Identify whether the review is running
on a development, customization,
release or production branch.

Do not use successful development
branch tests as proof that a separate
release branch is safe.

Review the actual target commit.

## 8. Findings

Classify defects:

P0 — Critical
P1 — High
P2 — Medium
P3 — Low

For each finding include:

- Severity
- File
- Relevant location
- Problem
- Evidence
- Recommended correction

Do not make speculative claims.

## 9. Final Decision

Return:

PASS
CONDITIONAL PASS
FAIL
BLOCKED

PASS requires evidence.

A code review PASS does not
authorise production deployment.

## Final Report

Provide:

1. Review target
2. Changed files
3. Architecture assessment
4. Code quality findings
5. Security findings
6. Data integrity findings
7. Regression test results
8. Outstanding defects
9. Final decision
