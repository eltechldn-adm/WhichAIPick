export async function onRequestGet({ request, env }) {
    // Auth Check
    const authHeader = request.headers.get('Authorization');
    if (!env.ADMIN_REVIEW_TOKEN || authHeader !== `Bearer ${env.ADMIN_REVIEW_TOKEN}`) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    if (!key) {
        return new Response(JSON.stringify({ error: "Missing key parameter" }), { status: 400, headers: { "Content-Type": "application/json" } });
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
        const payloadRaw = await env.WHICHAIPICK_KV.get(key);
        if (!payloadRaw) {
            return new Response(JSON.stringify({ error: "Submission not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
        }
        return new Response(payloadRaw, { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}
