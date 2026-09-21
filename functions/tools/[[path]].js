/**
 * functions/tools/[[path]].js
 *
 * Cloudflare Pages Middleware for /tools/* routes.
 *
 * Rule:
 *   /tools/              → index,follow  (pass through unmodified)
 *   /tools/?pricing=...  → add X-Robots-Tag: noindex, follow header
 *   /tools/?category=... → add X-Robots-Tag: noindex, follow header
 *   /tools/?usecase=...  → add X-Robots-Tag: noindex, follow header
 *   /tools/?sort=...     → add X-Robots-Tag: noindex, follow header
 *   /tools/?freeTier=... → add X-Robots-Tag: noindex, follow header
 *   /tools/?search=...   → add X-Robots-Tag: noindex, follow header
 *
 * The canonical URL returned remains /tools/ for all faceted states.
 * This is a server-level signal in addition to the JS fallback in browse.js.
 */

// Faceted query parameters that trigger noindex
const FACETED_PARAMS = new Set([
    'pricing',
    'category',
    'usecase',
    'sort',
    'freeTier',
    'search',
    'filter',
    'q',
    'page',
    'tab',
]);

export async function onRequest(context) {
    const { request, next } = context;
    const url = new URL(request.url);

    // Check if any faceted parameters are present
    const hasFacetedParams = [...url.searchParams.keys()].some(key =>
        FACETED_PARAMS.has(key)
    );

    // Fetch the actual response from the static asset
    const response = await next();

    if (!hasFacetedParams) {
        // Plain /tools/ — pass through completely unmodified
        return response;
    }

    // Faceted state — clone response and inject X-Robots-Tag header
    const newHeaders = new Headers(response.headers);
    newHeaders.set('X-Robots-Tag', 'noindex, follow');

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
    });
}
