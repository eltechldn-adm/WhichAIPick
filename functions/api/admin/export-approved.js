export async function onRequestGet({ request, env }) {
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

        const approvedKeys = summaries.filter(s => s.status === 'Approved').map(s => s.key);
        const mappedTools = [];

        // Fetch existing tools to check for ID collisions
        let existingIds = new Set();
        try {
            const urlObj = new URL(request.url);
            const liveUrl = `${urlObj.origin}/data/tools.json`;
            const toolsRes = await env.ASSETS.fetch(liveUrl);
            if (toolsRes.ok) {
                const toolsList = await toolsRes.json();
                toolsList.forEach(t => existingIds.add(t.id));
            }
        } catch (err) {
            console.error("Failed to fetch existing tools for collision detection:", err);
            // proceed even if we can't fetch it, we will just rely on base slug
        }

        const ALLOWED_CATEGORIES = [
            "Text & Writing", "Image & Design", "Video & Animation",
            "Audio & Voice", "Coding & Development", "Business & Marketing",
            "Productivity", "Other"
        ];

        for (const key of approvedKeys) {
            const payloadRaw = await env.WHICHAIPICK_KV.get(key);
            if (payloadRaw) {
                const sub = JSON.parse(payloadRaw);

                // Validation Schema Checks
                if (!sub.tool_name || !sub.website_url || !sub.primary_category || !sub.pricing_model || !sub.description) {
                    continue; // Skip silently or we could log it. Requirements dictate "prevent bad data"
                }

                // Validate URL protocol
                let safeUrl = sub.website_url.trim();
                if (!safeUrl.startsWith('http://') && !safeUrl.startsWith('https://')) {
                    safeUrl = 'https://' + safeUrl;
                }

                // Try parse URL to ensure domain extraction works
                try {
                    new URL(safeUrl);
                } catch (e) {
                    continue; // Invalid URL structure
                }

                // Validate Category
                let finalCategory = sub.primary_category;
                if (!ALLOWED_CATEGORIES.includes(finalCategory)) {
                    finalCategory = "Other"; // Fallback if they somehow bypassed
                }

                let baseId = slugify(sub.tool_name);
                let uniqueId = baseId;
                let counter = 2;

                while (existingIds.has(uniqueId)) {
                    uniqueId = `${baseId}-${counter}`;
                    counter++;
                }
                existingIds.add(uniqueId); // Claim it for this batch

                const exportObj = {
                    id: uniqueId,
                    name: sub.tool_name,
                    tagline: sub.tagline,
                    description_html: `<p>${escapeHTML(sub.description).replace(/\\n/g, '<br>')}</p>`,
                    website_url: safeUrl,
                    image_url: sub.logo_url || "",
                    category: finalCategory,
                    pricing_model: sub.pricing_model,
                    has_free_tier: sub.has_free_tier === true || sub.has_free_tier === "true",
                    platforms: sub.platforms || [],
                    tags: Array.isArray(sub.tags) ? sub.tags : (sub.tags ? sub.tags.split(',').map(t => t.trim()).filter(Boolean) : []),
                    key_features: sub.key_features || [],
                    best_use_cases: sub.use_cases || [],
                    target_users: sub.target_users || []
                };

                mappedTools.push(exportObj);
            }
        }

        // Return JSON as attachment
        const responseString = JSON.stringify(mappedTools, null, 2);
        return new Response(responseString, {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": 'attachment; filename="approved_tools_patch.json"'
            }
        });

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}

function slugify(text) {
    if (!text) return "unknown";
    return text
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
