---
name: whichaipick-release-safety
description: Reviews WhichAIPick Git branches, Cloudflare Pages releases, selective tool-page builds, rollback readiness and production deployment risks. Use before deployment planning, release approval, canary rollout or rollback.
---

# WhichAIPick Release Safety

## Purpose

Verify deployment safety before any
release-related activity.

Follow the existing MCD v2.0.

This skill provides procedures,
not deployment authorisation.

## Step 1 — Repository

Verify:

- Current Git branch
- Working tree status
- Local and remote commit SHAs
- Production baseline
- Release branch ancestry
- Release diff

Never invent commit hashes.

## Step 2 — Change Scope

Identify:

- Expected changed files
- Unexpected changed files
- Unrelated development commits
- Protected production components

Stop if release scope is unclear.

## Step 3 — Build Verification

Run relevant existing build and QA
commands for the current task.

Verify actual generated output.

Do not assume test execution means PASS.

For selective Tool Page V2 canaries,
confirm exact V1 and V2 counts against
the approved release manifest.

## Step 4 — SEO Protection

Verify:

- Production canonical URLs
- Preview noindex protection
- Sitemap integrity
- Robots directives
- Redirect preservation

Never make preview pages indexable.

## Step 5 — Cloudflare

Verify:

- Deployment environment
- Deployment ID
- Branch
- Full commit SHA
- Build status
- Actual deployed HTML

Do not invent deployment URLs.

## Step 6 — Rollback

Identify the last known-good
successful production deployment.

Document non-destructive recovery.

Never force-push or hard-reset main.

Never execute rollback without
specific approval.

## Step 7 — Release Decision

Return:

PASS
FAIL
BLOCKED
NOT TESTED

Provide evidence for every PASS.

A successful build is not automatic
permission to deploy.

## Production Protection

Do not deploy to production unless
the project owner has explicitly
authorised that specific release
and its approved scope.

Do not expand release scope.

Stop on unexpected changes.

## Final Output

Return:

1. Repository status
2. Release scope
3. Build verification
4. SEO verification
5. Deployment verification
6. Rollback readiness
7. Outstanding risks
8. Final decision
