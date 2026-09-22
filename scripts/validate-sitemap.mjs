import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');
const DOMAIN = 'https://whichaipick.com';

function validateSitemap() {
    console.log('\n[SITEMAP VALIDATION] Starting...');
    const sitemapPath = path.join(PROJECT_ROOT, 'sitemap.xml');
    if (!fs.existsSync(sitemapPath)) {
        console.error('❌ sitemap.xml not found!');
        return;
    }

    const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
    const locRegex = /<loc>(.*?)<\/loc>/g;
    
    const urls = [];
    let match;
    while ((match = locRegex.exec(sitemapContent)) !== null) {
        urls.push(match[1]);
    }

    console.log(`[SITEMAP VALIDATION] Found ${urls.length} URLs in sitemap.`);

    const uniqueUrls = new Set();
    let errors = 0;

    urls.forEach(url => {
        // 1. HTTPS and Hostname check
        if (!url.startsWith(DOMAIN)) {
            console.error(`❌ Invalid hostname/protocol: ${url}`);
            errors++;
        }

        // 2. Duplicate check
        if (uniqueUrls.has(url)) {
            console.error(`❌ Duplicate URL in sitemap: ${url}`);
            errors++;
        }
        uniqueUrls.add(url);

        // 3. Map to local file
        let localPath = url.replace(DOMAIN, '');
        if (localPath === '' || localPath === '/') {
            localPath = '/index.html';
        }
        
        // Remove leading slash
        if (localPath.startsWith('/')) {
            localPath = localPath.substring(1);
        }

        let absolutePath = path.join(PROJECT_ROOT, localPath);
        if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory()) {
            absolutePath = path.join(absolutePath, 'index.html');
        }



        // 4. Check 404 (File exists)
        if (!fs.existsSync(absolutePath)) {
            console.error(`❌ 404 Destination (File not found): ${url} -> ${localPath}`);
            errors++;
            return;
        }

        const content = fs.readFileSync(absolutePath, 'utf8');

        // 5. Check if it's a redirect
        if (content.includes('http-equiv="refresh"')) {
            console.error(`❌ Redirected Destination in sitemap: ${url}`);
            errors++;
        }

        // 6. Check if it's non-indexable
        if (content.includes('noindex')) {
            console.error(`❌ Non-indexable URL in sitemap: ${url}`);
            errors++;
        }

        // 7. Check if canonical matches
        const canonMatch = content.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"[^>]*>/i);
        if (canonMatch) {
            const canonical = canonMatch[1];
            if (canonical !== url) {
                console.error(`❌ Canonical mismatch: Sitemap has ${url}, but canonical is ${canonical}`);
                errors++;
            }
        } else {
             console.error(`❌ Missing canonical in file for sitemap URL: ${url}`);
             errors++;
        }
    });

    if (errors > 0) {
        console.error(`\n[SITEMAP VALIDATION] ❌ Failed with ${errors} errors.`);
    } else {
        console.log(`\n[SITEMAP VALIDATION] ✅ Passed! All ${urls.length} URLs are valid, indexable, and match canonicals.`);
    }
}

validateSitemap();
