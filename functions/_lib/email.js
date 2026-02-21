// functions/_lib/email.js

/**
 * Sends an email using the Cloudflare MailChannels integration.
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.from - Sender email address
 * @param {string} params.fromName - Sender name
 * @param {string} params.subject - Email subject
 * @param {string} params.text - Plain text content
 * @param {string} params.html - HTML content
 * @returns {Promise<boolean>} True if successful, throws if request fails.
 */
export async function sendMail({ to, from, fromName, subject, text, html }) {
    const payload = {
        personalizations: [
            {
                to: [{ email: to }]
            }
        ],
        from: {
            email: from,
            name: fromName || "WhichAIPick System"
        },
        subject: subject,
        content: [
            { type: "text/plain", value: text },
            { type: "text/html", value: html }
        ]
    };

    const response = await fetch("https://api.mailchannels.net/tx/v1/send", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        let errorText = "";
        try {
            errorText = await response.text();
        } catch (e) {
            // Ignore
        }
        throw new Error(`MailChannels API responded with status ${response.status}: ${errorText}`);
    }

    return true;
}
