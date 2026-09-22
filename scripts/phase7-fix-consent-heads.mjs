/**
 * Phase 7 — Fix AdSense double-load across all HTML files.
 *
 * Per file:
 *   1. Remove unconditional <script async src="...adsbygoogle.js..."> tag
 *   2. Inject Google Consent Mode v2 default-denied signals inline BEFORE consent.js
 *
 * This ensures:
 *   - AdSense only loads post-consent (via consent.js)
 *   - Consent Mode v2 signals are set before ANY gtag calls
 *   - No duplicate script loading
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// The Consent Mode v2 default-denied snippet (inline, before consent.js)
const CONSENT_MODE_V2_SNIPPET = `
    <!-- Google Consent Mode v2 — Default denied signals (Phase 7) -->
    <!-- Must appear BEFORE any gtag / AdSense calls. Updated by consent.js on user choice. -->
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        // Default: deny all consent signals for EEA/UK compliance
        // consent.js will update these based on user choice
        gtag('consent', 'default', {
            ad_storage: 'denied',
            analytics_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            wait_for_update: 500
        });
        gtag('js', new Date());
    </script>
    <!-- End Google Consent Mode v2 default signals -->
`;

// Pattern to remove — the unconditional AdSense script tag
const ADSENSE_SCRIPT_REGEX = /\n?\s*<script\s+async\s+src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^"]*"\s+crossorigin="anonymous"><\/script>\n?/g;

// The consent.js script tag to find and prepend the CM2 snippet before
const CONSENT_SCRIPT_PATTERN = '<script src="/js/consent.js"></script>';

// Files to process (top-level HTML files with the unconditional script)
const TOP_LEVEL_FILES = [
    'about.html', 'academy.html', 'accessibility.html', 'affiliate-disclosure.html',
    'blog.html', 'compare.html', 'contact.html', 'cookies.html', 'corrections-policy.html',
    'data-transparency.html', 'disclosure.html', 'editorial-policy.html', 'index.html',
    'make-money.html', 'newsletter.html', 'pricing-accuracy-policy.html', 'privacy.html',
    'report-misuse.html', 'review-methodology.html', 'search.html', 'submit-tool.html',
    'terms.html', 'use-cases.html'
];

let totalFixed = 0;
let totalSkipped = 0;

for (const filename of TOP_LEVEL_FILES) {
    const filePath = path.join(ROOT, filename);
    if (!fs.existsSync(filePath)) {
        console.log(`[SKIP] ${filename} — file not found`);
        totalSkipped++;
        continue;
    }

    let html = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Step 1: Remove unconditional AdSense script
    if (ADSENSE_SCRIPT_REGEX.test(html)) {
        html = html.replace(ADSENSE_SCRIPT_REGEX, '\n');
        changed = true;
        ADSENSE_SCRIPT_REGEX.lastIndex = 0; // reset regex state
    }

    // Step 2: Inject Consent Mode v2 snippet before consent.js (if not already present)
    if (html.includes(CONSENT_SCRIPT_PATTERN) && !html.includes('Consent Mode v2')) {
        html = html.replace(
            CONSENT_SCRIPT_PATTERN,
            CONSENT_MODE_V2_SNIPPET + '    ' + CONSENT_SCRIPT_PATTERN
        );
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(filePath, html, 'utf8');
        console.log(`[FIXED] ${filename}`);
        totalFixed++;
    } else {
        console.log(`[OK]    ${filename} — no changes needed`);
        totalSkipped++;
    }
}

// Also fix the generated tool/category pages that have the meta tag (not the script)
// These only have the meta tag, not the script — no change needed there
// But add Consent Mode v2 snippet to browse.html, category.html, tool.html, find.html

const TEMPLATE_FILES_WITH_CONSENT = ['browse.html', 'category.html', 'tool.html', 'find.html'];
for (const filename of TEMPLATE_FILES_WITH_CONSENT) {
    const filePath = path.join(ROOT, filename);
    if (!fs.existsSync(filePath)) continue;

    let html = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Remove any unconditional AdSense script if present
    ADSENSE_SCRIPT_REGEX.lastIndex = 0;
    if (ADSENSE_SCRIPT_REGEX.test(html)) {
        html = html.replace(ADSENSE_SCRIPT_REGEX, '\n');
        changed = true;
        ADSENSE_SCRIPT_REGEX.lastIndex = 0;
    }

    // Inject CM2 snippet before consent.js if present and not already done
    if (html.includes(CONSENT_SCRIPT_PATTERN) && !html.includes('Consent Mode v2')) {
        html = html.replace(
            CONSENT_SCRIPT_PATTERN,
            CONSENT_MODE_V2_SNIPPET + '    ' + CONSENT_SCRIPT_PATTERN
        );
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(filePath, html, 'utf8');
        console.log(`[FIXED] ${filename} (template)`);
        totalFixed++;
    } else {
        console.log(`[OK]    ${filename} (template) — no changes needed`);
    }
}

console.log(`\n✅ Phase 7 head fix complete: ${totalFixed} files updated, ${totalSkipped} skipped.`);
