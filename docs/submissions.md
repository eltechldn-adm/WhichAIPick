# WhichAIPick: Operations Guide for Admin Dashboard

The "Submit a Tool" pipeline is powered exclusively by Cloudflare KV and a static UI dashboard. No external databases, no Node servers, and no automated emails exist in this loop.

## 1. Running Locally
To test the full submission loop on your machine:
```bash
npx wrangler pages dev . --port 8080 --kv WHICHAIPICK_KV
```
> **Note:** If `TURNSTILE_SECRET` is omitted from your local environment, local validations will skip the Turnstile check to allow seamless development.

## 2. Setting up Cloudflare (Production)
For the API and Dashboard to work correctly in production, you must set these bindings in the **Cloudflare Dashboard** -> Pages -> WhichAIPick -> Settings:

### KV Namespace
- Add a binding named: `WHICHAIPICK_KV`

### Environment Variables (Encrypted recommended)
- `TURNSTILE_SECRET`: The secret key from your Turnstile dashboard.
- `ADMIN_REVIEW_TOKEN`: A custom, highly complex password string you generate. This is used to gate the dashboard.
- `NOTIFICATION_EMAIL_TO`: E.g., `admin@whichaipick.com`. Where to send the new submission alerts.
- `NOTIFICATION_EMAIL_FROM`: E.g., `system@whichaipick.com`. Authorized domain via Cloudflare Email Routing.

## 3. Email Notifications
Upon a successful KV write, the Edge Function attempts to dispatch an email via Cloudflare's **MailChannels** integration.
- This is purely an optional notification layer.
- If email delivery fails (or if `NOTIFICATION_EMAIL_TO` / `FROM` are omitted), the submission will still successfully write to KV, and the user will see a green success message.
- **Troubleshooting**: If emails are not arriving:
  1. Verify the `NOTIFICATION_EMAIL_FROM` domain matches the domain executed by Workers (or has proper Cloudflare Email Routing SPF/DKIM).
  2. Verify your destination inbox spam folder.
  3. Check the Pages local/deployment logs for `MailChannels notification failed`.

## 4. Reviewing Submissions & Observability
You do not need to read logs or database dumps.
Navigate your browser to exactly:
`https://[YOUR_DOMAIN]/admin/submissions.html`

- **Authentication:** Upon loading, you will be prompted for your `ADMIN_REVIEW_TOKEN`. This gets saved in your browser's session storage.
- **Workflow:** You can browse all items locally, update their statuses ("Approved", "Rejected", "Needs Info") using quick actions, and append internal notes.
- **Observability:** At the top of the interface, you will see real-time, daily KV telemetry counters detailing `Today's Submissions`, `Email Successes`, and `Email Failures`.

## 5. Applying Approved Tools to Production
This pipeline is designed to eliminate manual data entry.
1. When you are done reviewing, click **"Export Approved Tools Patch"** in the top right of the dashboard.
2. The endpoint will execute strict schema validations:
   - Filters out approvals missing required properties (name, url, description etc).
   - Generates a URL-safe `<id>` slug, appending deduplication suffixes (e.g., `-2`) if conflicts occur.
   - Enforces correct URL schemes (http:// / https://) and verifies category taxonomy mappings.
3. A JSON file named `approved_tools_patch_[timestamp].json` will securely download to your machine.
4. Copy the objects inside that array and paste them directly into your version-controlled `data/tools.json`.
5. Run your standard build procedure to verify, commit, and push. 
6. Cloudflare Pages will auto-deploy the new tools.
