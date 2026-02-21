export async function onRequestGet({ request, env }) {
    // Auth Check
    const authHeader = request.headers.get('Authorization');
    if (!env.ADMIN_REVIEW_TOKEN || authHeader !== `Bearer ${env.ADMIN_REVIEW_TOKEN}`) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    if (!env.WHICHAIPICK_KV) {
        return new Response(JSON.stringify({ error: "KV not bound" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    // Lightweight Rate Limiting
    const ip = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
    const rlKey = `rl:admin:${ip}`;
    if (env.WHICHAIPICK_KV) {
        const rlData = await env.WHICHAIPICK_KV.get(rlKey);
        let currentCount = parseInt(rlData || '0', 10);
        if (currentCount >= 100) {
            return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { "Content-Type": "application/json" } });
        }
        await env.WHICHAIPICK_KV.put(rlKey, (currentCount + 1).toString(), { expirationTtl: 3600 });
    }

    try {
        const indexRaw = await env.WHICHAIPICK_KV.get('submit:summary:index');
        const summaries = indexRaw ? JSON.parse(indexRaw) : [];
        return new Response(JSON.stringify({ success: true, count: summaries.length, data: summaries }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}
