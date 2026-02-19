# WhichAIPick — Routing Guide

## Canonical URL Scheme

| Route type | Canonical URL | Status |
|---|---|---|
| Tools directory | `/tools/` | `tools/index.html` |
| Tool detail | `/tool.html?id=<id>` | `tool.html` |
| Academy hub | `/academy.html` | `academy.html` |
| Blog hub | `/blog.html` | `blog.html` |
| Compare hub | `/compare.html` | `compare.html` |
| Use Cases hub | `/use-cases.html` | `use-cases.html` |
| Make Money hub | `/make-money.html` | `make-money.html` |
| Start Here | `/start-here.html` | `start-here.html` |
| Leaf pages | `/academy/<slug>/` | `academy/<slug>/index.html` |

## Redirects

All redirect rules live in `_redirects` (Cloudflare Pages format).

```
/tool        /tool.html    301   # Preserves ?id= query string automatically
/tool/       /tool.html    301
/academy     /academy.html 301
/academy/    /academy.html 301
/browse.html /tools/       301
...etc
```

> **Cloudflare Pages behaviour:** query strings (`?id=XYZ`) are automatically preserved through 301 redirects — no extra config needed.

## Tool Detail Page ID Resolution

`tool.html` resolves the tool ID using this fallback chain:

1. `?id=<id>` — canonical param (always use this)
2. `?tool=<id>` or `?slug=<id>` — legacy param aliases
3. Pathname segment: `/tool/<id>` (handles URL-style deep links)
4. **None found** → auto-redirects to `/tools/` after 2.5s with friendly message

## Local Development

### Option 1 — Simple static preview (fast, no `_redirects` support)
```bash
python3 -m http.server 8080
# or
npx serve . -p 8080
```
**⚠ Limitation:** `_redirects` is not processed. Visiting `/tool?id=X` will 404.  
**✅ OK for:** Reviewing UI changes, card layout, CSS tweaks.

### Option 2 — Cloudflare-accurate local dev (`_redirects` respected)
```bash
npx wrangler pages dev . --port 8080
```
**✅ Behaviour:** Reads `_redirects`, proxies routes, matches production Cloudflare behaviour.  
Install once: `npm install -D wrangler`

### Option 3 — `http-server` with cache-disabled
```bash
npx http-server . -p 8080 -c-1
```
**⚠ Same limitation as Option 1** — no `_redirects` support. Use Wrangler for routing tests.

## Why Python and `serve` Differ

| Server | Reads `_redirects` | Handles clean folder routes | Cache |
|---|---|---|---|
| `python3 -m http.server` | ❌ No | ✅ Yes (serves index.html) | ✅ No cache |
| `npx serve` | ❌ No | ✅ Yes | Configurable |
| `npx wrangler pages dev` | ✅ **Yes** | ✅ Yes | No cache |

For accurate routing behaviour that matches production, **always use Wrangler** when testing redirects.

## Verification URLs (local port 8080)

```
http://localhost:8080/tools/
http://localhost:8080/tool.html?id=chatgpt
http://localhost:8080/category.html?c=Productivity
http://localhost:8080/tool.html?id=claude
http://localhost:8080/tool.html   ← should auto-redirect to /tools/ after 2.5s
```

When using Wrangler:
```
http://localhost:8080/tool?id=chatgpt   ← should 301 to /tool.html?id=chatgpt
http://localhost:8080/tool/             ← should 301 to /tool.html
```
