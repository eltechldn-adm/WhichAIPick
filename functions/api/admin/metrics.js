export async function onRequestGet({ request, env }) {
    // 1. Authorization Check
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
        const dateKey = new Date().toISOString().split('T')[0];

        // Fetch counters
        const totalRaw = await env.WHICHAIPICK_KV.get(`metrics:submit_total_daily:${dateKey}`);
        const successRaw = await env.WHICHAIPICK_KV.get(`metrics:submit_email_success_daily:${dateKey}`);
        const failRaw = await env.WHICHAIPICK_KV.get(`metrics:submit_email_fail_daily:${dateKey}`);

        const payload = {
            date: dateKey,
            submissions: parseInt(totalRaw || "0", 10),
            email_success: parseInt(successRaw || "0", 10),
            email_fail: parseInt(failRaw || "0", 10)
        };

        return new Response(JSON.stringify(payload), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}
