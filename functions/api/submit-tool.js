import { sendMail } from '../_lib/email.js';

export async function onRequestPost({ request, env }) {
    // Helper for metrics tracking
    const incrementMetric = async (keyPrefix) => {
        if (!env.WHICHAIPICK_KV) return;
        try {
            const dateKey = new Date().toISOString().split('T')[0];
            const fullKey = `metrics:${keyPrefix}:${dateKey}`;
            let current = parseInt(await env.WHICHAIPICK_KV.get(fullKey) || "0", 10);
            await env.WHICHAIPICK_KV.put(fullKey, (current + 1).toString());
        } catch (e) {
            console.error("Metric tracking failed:", e);
        }
    };

    try {
        // 1. Parse payload
        const payload = await request.json().catch(() => null);
        if (!payload) {
            return new Response(JSON.stringify({ error: "Invalid JSON payload" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        // 2. Honeypot Check
        if (payload.website_url_hp) {
            // Silently pretend success to fool bots
            return new Response(JSON.stringify({ success: true, simulated: true }), { status: 200, headers: { "Content-Type": "application/json" } });
        }

        // 3. Rate Limit Check (5 requests per IP per hour)
        const ip = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
        const rlKey = `rl:submit:${ip}`;
        let currentCount = 0;

        if (env.WHICHAIPICK_KV) {
            const rlData = await env.WHICHAIPICK_KV.get(rlKey);
            if (rlData) {
                currentCount = parseInt(rlData, 10);
            }
            if (currentCount >= 5) {
                return new Response(JSON.stringify({ error: "Too many submissions from this IP. Please try again later." }), { status: 429, headers: { "Content-Type": "application/json" } });
            }
            await env.WHICHAIPICK_KV.put(rlKey, (currentCount + 1).toString(), { expirationTtl: 3600 });
        }

        // 4. Turnstile Validation
        const token = payload['cf-turnstile-response'];

        // Verify turnstile with CF API (Skip validation if secret is not set yet in dev)
        if (env.TURNSTILE_SECRET) {
            if (!token) {
                return new Response(JSON.stringify({ error: "Anti-spam verification failed. Turnstile token missing." }), { status: 400, headers: { "Content-Type": "application/json" } });
            }

            const formData = new FormData();
            formData.append('secret', env.TURNSTILE_SECRET);
            formData.append('response', token);
            formData.append('remoteip', ip);

            const turnstileResult = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                body: formData,
                method: 'POST',
            }).then(r => r.json()).catch(() => ({ success: false }));

            if (!turnstileResult.success && turnstileResult["error-codes"]) {
                console.warn('Turnstile Failed:', turnstileResult["error-codes"]);
                // Optional: In local dev without a real token, this might fail unless using dummy secret
                // If it's the dummy "1x0000000000000000000000000000000AA" it will always pass. 
                // We'll enforce validation.
                return new Response(JSON.stringify({ error: "Invalid Turnstile token." }), { status: 400, headers: { "Content-Type": "application/json" } });
            }
        }

        // 5. Basic Validation
        const required = ['tool_name', 'website_url', 'tagline', 'description', 'primary_category', 'pricing_model', 'submitter_email', 'relationship'];
        for (const field of required) {
            if (!payload[field] || String(payload[field]).trim() === '') {
                return new Response(JSON.stringify({ error: `Missing required field: ${field}` }), { status: 400, headers: { "Content-Type": "application/json" } });
            }
        }

        // URL validation loosely
        const urlFields = ['website_url', 'logo_url', 'demo_url'];
        for (const field of urlFields) {
            if (payload[field] && !/^https?:\/\//i.test(payload[field])) {
                return new Response(JSON.stringify({ error: `Invalid URL format for ${field}, must start with http/https` }), { status: 400, headers: { "Content-Type": "application/json" } });
            }
        }

        if (String(payload.description).length < 300) {
            return new Response(JSON.stringify({ error: "Description must be at least 300 characters long." }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        // 6. Pricing Consistency Rule
        const requiresFree = ['free', 'freemium', 'free_trial', 'open_source'].includes(payload.pricing_model);
        if (requiresFree && !payload.has_free_tier) {
            return new Response(JSON.stringify({ error: "Pricing model inconsistency: model requires free tier." }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        // 7. Enhanced KV Storage & Indexing
        const submissionId = `submit:${Date.now()}:${Math.random().toString(36).substring(2, 8)}`;
        if (env.WHICHAIPICK_KV) {
            const newSubmission = {
                ...payload,
                id: submissionId,
                created_at: new Date().toISOString(),
                ip,
                status: 'new',
                reviewer_notes: ''
            };

            // Save main payload
            await env.WHICHAIPICK_KV.put(submissionId, JSON.stringify(newSubmission));

            // Update Summary Index (submit:summary:index)
            try {
                const summaryIndexRaw = await env.WHICHAIPICK_KV.get('submit:summary:index');
                let summaryIndex = summaryIndexRaw ? JSON.parse(summaryIndexRaw) : [];

                summaryIndex.unshift({
                    key: submissionId,
                    tool_name: newSubmission.tool_name,
                    website_url: newSubmission.website_url,
                    created_at: newSubmission.created_at,
                    status: newSubmission.status
                });

                if (summaryIndex.length > 2000) summaryIndex = summaryIndex.slice(0, 2000);
                await env.WHICHAIPICK_KV.put('submit:summary:index', JSON.stringify(summaryIndex));

                // Update Keys Index (submit:index)
                const indexRaw = await env.WHICHAIPICK_KV.get('submit:index');
                let indexData = indexRaw ? JSON.parse(indexRaw) : [];
                indexData.unshift(submissionId);
                if (indexData.length > 2000) indexData = indexData.slice(0, 2000);
                await env.WHICHAIPICK_KV.put('submit:index', JSON.stringify(indexData));

            } catch (idxErr) {
                console.error("Index update failed", idxErr);
                // Non-fatal, main payload is stored.
            }

            // Track submission metric
            await incrementMetric('submit_total_daily');
        }

        // 8. Send Email notification via MailChannels
        if (env.NOTIFICATION_EMAIL_TO && env.NOTIFICATION_EMAIL_FROM) {
            try {
                const subject = `[WhichAIPick] New Tool Submission: ${payload.tool_name} (${payload.pricing_model})`;

                const textContent = `
New submission for ${payload.tool_name}.
Website: ${payload.website_url}
Category: ${payload.primary_category}
Pricing: ${payload.pricing_model}
Admin Link: https://whichaipick.com/admin/submissions.html
                `;

                const htmlContent = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                        <h2 style="color: #1a1a2e;">New Tool Submission: ${escapeHTML(payload.tool_name)}</h2>
                        <p><strong>KV Key:</strong> <code>${submissionId}</code></p>
                        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
                        <p><strong>Type:</strong> ${escapeHTML(payload.submission_type)}</p>
                        <p><strong>Website:</strong> <a href="${escapeHTML(payload.website_url)}">${escapeHTML(payload.website_url)}</a></p>
                        <p><strong>Category:</strong> ${escapeHTML(payload.primary_category)}</p>
                        <p><strong>Tags:</strong> ${escapeHTML(payload.tags || 'None')}</p>
                        <hr style="border-top:1px solid #ccc;">
                        <h3>Pricing & Features</h3>
                        <p><strong>Model:</strong> ${escapeHTML(payload.pricing_model)} (Free Tier: ${payload.has_free_tier ? 'Yes' : 'No'})</p>
                        <p><strong>Notes:</strong> ${escapeHTML(payload.pricing_notes || 'None')}</p>
                        <hr style="border-top:1px solid #ccc;">
                        <h3>Description</h3>
                        <p>${escapeHTML(payload.description).replace(/\n/g, '<br>')}</p>
                        <hr style="border-top:1px solid #ccc;">
                        <h3>Links & Assets</h3>
                        <p><strong>Logo URL:</strong> ${escapeHTML(payload.logo_url || 'N/A')}</p>
                        <p><strong>Demo URL:</strong> ${escapeHTML(payload.demo_url || 'N/A')}</p>
                        <p><strong>Consent Given:</strong> Yes</p>
                        <hr style="border-top:1px solid #ccc;">
                        <h3>✅ Review Checklist</h3>
                        <ul>
                            <li>[ ] Valid URL? Does it look like a real product?</li>
                            <li>[ ] Category fits our taxonomy?</li>
                            <li>[ ] Pricing model accurate?</li>
                            <li>[ ] Duplicates an existing tool?</li>
                        </ul>
                        <br>
                        <a href="https://whichaipick.com/admin/submissions.html" style="display:inline-block; padding:10px 16px; background:#f5a623; color:#1a1a2e; text-decoration:none; font-weight:bold; border-radius:4px;">Go to Admin Dashboard</a>
                    </div>
                `;

                await sendMail({
                    to: env.NOTIFICATION_EMAIL_TO,
                    from: env.NOTIFICATION_EMAIL_FROM,
                    fromName: "WhichAIPick Submissions",
                    subject: subject,
                    text: textContent,
                    html: htmlContent
                });
                await incrementMetric('submit_email_success_daily');
            } catch (emailErr) {
                console.error("MailChannels notification failed:", emailErr);
                await incrementMetric('submit_email_fail_daily');
                // Deliberately swallowing error so submission succeeds
            }
        } else if (!env.NOTIFICATION_EMAIL_TO || !env.NOTIFICATION_EMAIL_FROM) {
            console.warn("MailChannels skipped: NOTIFICATION_EMAIL_TO or NOTIFICATION_EMAIL_FROM missing.");
            await incrementMetric('submit_email_fail_daily');
        }

        return new Response(JSON.stringify({ ok: true, submission_id: submissionId, stored: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (e) {
        console.error("Function Error:", e);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
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
