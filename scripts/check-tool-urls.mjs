import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOOLS_JSON_FILE = path.join(__dirname, '../data/tools.json');
const REPORT_FILE = path.join(__dirname, '../reports/dead-links.json');

const toolsJson = JSON.parse(fs.readFileSync(TOOLS_JSON_FILE, 'utf8'));

// Only check active tools to save time and bandwidth
const activeTools = toolsJson.filter(t => t.operationalStatus === 'active');

console.log(`Starting URL health check for ${activeTools.length} active tools...`);

// Simple async queue for concurrency
async function asyncPool(poolLimit, array, iteratorFn) {
    const ret = [];
    const executing = [];
    for (const item of array) {
        const p = Promise.resolve().then(() => iteratorFn(item, array));
        ret.push(p);
        if (poolLimit <= array.length) {
            const e = p.then(() => executing.splice(executing.indexOf(e), 1));
            executing.push(e);
            if (executing.length >= poolLimit) {
                await Promise.race(executing);
            }
        }
    }
    return Promise.all(ret);
}

function checkUrl(urlStr, timeoutMs = 10000) {
    return new Promise((resolve) => {
        if (!urlStr || (!urlStr.startsWith('http://') && !urlStr.startsWith('https://'))) {
            return resolve({ status: 'INVALID', error: 'Malformed URL' });
        }

        const client = urlStr.startsWith('https') ? https : http;
        
        let urlObj;
        try {
            urlObj = new URL(urlStr);
        } catch (e) {
            return resolve({ status: 'ERROR', error: 'Invalid URL object' });
        }

        const req = client.request(urlObj, {
            method: 'HEAD',
            timeout: timeoutMs,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; WhichAIPick/1.0; +https://whichaipick.com)'
            }
        }, (res) => {
            const code = res.statusCode;
            if (code >= 200 && code < 300) {
                resolve({ status: 'healthy', code });
            } else if (code >= 300 && code < 400) {
                resolve({ status: 'redirected', code, location: res.headers.location });
            } else if (code === 404) {
                resolve({ status: 'not_found', code });
            } else if (code === 403 || code === 429) {
                resolve({ status: 'forbidden_or_bot_blocked', code });
            } else if (code === 405) {
                resolve({ status: 'method_not_allowed', code });
            } else if (code >= 500) {
                resolve({ status: 'server_error', code });
            } else {
                resolve({ status: 'unknown', code });
            }
        });

        req.on('error', (err) => {
            if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
                resolve({ status: 'dns_failure', error: err.message });
            } else {
                resolve({ status: 'unknown', error: err.message });
            }
        });
        
        req.on('timeout', () => {
            req.destroy();
            resolve({ status: 'timeout' });
        });

        req.end();
    });
}

async function main() {
    console.log(`[DEFERRED] CATALOGUE EXTERNAL CRAWL DEFERRED PENDING APPROVAL OF NEW ENRICHED SPREADSHEET.`);
    console.log(`(Note: No URL-health result will ever automatically change tool status in the canonical JSON.)`);
    fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
    fs.writeFileSync(REPORT_FILE, JSON.stringify([], null, 2), 'utf8');
    process.exit(0);
    
    const args = process.argv.slice(2);
    const limitArgIndex = args.indexOf('--limit');
    let limit = activeTools.length;
    if (limitArgIndex !== -1 && args[limitArgIndex + 1]) {
        limit = parseInt(args[limitArgIndex + 1], 10);
    }

    const toolsToCheck = activeTools.slice(0, limit);
    const deadLinks = [];

    let checkedCount = 0;

    await asyncPool(10, toolsToCheck, async (tool) => {
        const results = {};
        
        // Check Official URL
        const officialRes = await checkUrl(tool.website_url);
        if (officialRes.status === 'DEAD' || officialRes.status === 'ERROR' || officialRes.status === 'TIMEOUT') {
            results.website_url = { url: tool.website_url, ...officialRes };
        }

        // Check Affiliate URL if present
        if (tool.affiliate_url) {
            const affRes = await checkUrl(tool.affiliate_url);
            if (affRes.status === 'DEAD' || affRes.status === 'ERROR' || affRes.status === 'TIMEOUT') {
                results.affiliate_url = { url: tool.affiliate_url, ...affRes };
            }
        }

        if (Object.keys(results).length > 0) {
            deadLinks.push({
                id: tool.id,
                name: tool.name,
                issues: results
            });
        }

        checkedCount++;
        if (checkedCount % 50 === 0) {
            console.log(`Checked ${checkedCount} / ${toolsToCheck.length} tools...`);
        }
    });

    console.log(`\nURL Health Check Complete.`);
    console.log(`Found ${deadLinks.length} tools with potential dead links.`);
    
    fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
    fs.writeFileSync(REPORT_FILE, JSON.stringify(deadLinks, null, 2), 'utf8');
    
    console.log(`Report written to ${REPORT_FILE}`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
