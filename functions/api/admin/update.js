export async function onRequestPost({ request, env }) {
    const authHeader = request.headers.get('Authorization');
    if (!env.ADMIN_REVIEW_TOKEN || authHeader !== `Bearer ${env.ADMIN_REVIEW_TOKEN}`) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    // Parse incoming JSON payload containing key, status, reviewer_notes
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const { key, status, reviewer_notes } = body;
    if (!key || !status) {
        return new Response(JSON.stringify({ error: "Missing key or status" }), { status: 400, headers: { "Content-Type": "application/json" } });
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
        // 1. Fetch full payload
        const payloadRaw = await env.WHICHAIPICK_KV.get(key);
        if (!payloadRaw) {
            return new Response(JSON.stringify({ error: "Submission not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
        }

        const payload = JSON.parse(payloadRaw);

        // 2. Mutate Main Payload
        payload.status = status;
        if (reviewer_notes !== undefined) {
            payload.reviewer_notes = reviewer_notes;
        }

        await env.WHICHAIPICK_KV.put(key, JSON.stringify(payload));

        // 3. Mutate Summary Index (Sync status so UI loads correctly)
        const summaryIndexRaw = await env.WHICHAIPICK_KV.get('submit:summary:index');
        if (summaryIndexRaw) {
            let summaryIndex = JSON.parse(summaryIndexRaw);
            const idx = summaryIndex.findIndex(item => item.key === key);
            if (idx !== -1) {
                summaryIndex[idx].status = status;
                await env.WHICHAIPICK_KV.put('submit:summary:index', JSON.stringify(summaryIndex));
            }
        }

        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}
