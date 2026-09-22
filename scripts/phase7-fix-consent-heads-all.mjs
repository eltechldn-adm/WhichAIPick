import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

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

const ADSENSE_SCRIPT_REGEX = /\n?\s*<script\s+async\s+src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^"]*"\s+crossorigin="anonymous"><\/script>\n?/g;
const CONSENT_SCRIPT_PATTERN = '<script src="/js/consent.js"></script>';

function walkSync(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const dirFile = path.join(dir, file);
    const dirent = fs.statSync(dirFile);
    if (dirent.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'scratch') {
        filelist = walkSync(dirFile, filelist);
      }
    } else {
      if (file.endsWith('.html')) {
        filelist.push(dirFile);
      }
    }
  }
  return filelist;
}

let totalFixed = 0;
const allHtmlFiles = walkSync(ROOT);

for (const filePath of allHtmlFiles) {
    let html = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    if (ADSENSE_SCRIPT_REGEX.test(html)) {
        html = html.replace(ADSENSE_SCRIPT_REGEX, '\n');
        changed = true;
        ADSENSE_SCRIPT_REGEX.lastIndex = 0;
    }

    if (html.includes(CONSENT_SCRIPT_PATTERN) && !html.includes('Consent Mode v2')) {
        html = html.replace(
            CONSENT_SCRIPT_PATTERN,
            CONSENT_MODE_V2_SNIPPET + '    ' + CONSENT_SCRIPT_PATTERN
        );
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(filePath, html, 'utf8');
        console.log(`[FIXED] ${filePath.replace(ROOT, '')}`);
        totalFixed++;
    }
}

console.log(`\n✅ Fixed ${totalFixed} files.`);
