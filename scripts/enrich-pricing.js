import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const TOOLS_FILE = path.join(__dirname, '../data/tools.json');
const REQUEST_TIMEOUT = 10000;
const CONCURRENT_LIMIT = 5;
const DELAY_BETWEEN_BATCHES = 400;

// Pricing Signals
const SIGNALS = {
    free: ['forever free', 'free plan', 'free tier', 'free forever', 'start for free'],
    trial: ['free trial', 'try free', 'start trial', '14-day trial', '7-day trial'],
    paid: ['per month', '/month', 'billed monthly', 'pricing starts', 'subscription', 'starting at $', 'starting at £']
};

/**
 * Fetch URL content with timeout and redirect handling
 */
function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        if (!url) return reject(new Error('No URL provided'));

        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            },
            timeout: REQUEST_TIMEOUT
        }, (res) => {
            // Handle redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const redirectUrl = new URL(res.headers.location, url).toString();
                return fetchUrl(redirectUrl).then(resolve).catch(reject);
            }

            if (res.statusCode !== 200) {
                res.resume();
                return reject(new Error(`Status code: ${res.statusCode}`));
            }

            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data.toLowerCase()));
        });

        req.on('error', (err) => reject(err));
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
    });
}

/**
 * Analyze HTML content for pricing signals
 */
function analyzeContent(html) {
    // 1. Check for Free Tier (Strongest signal)
    for (const signal of SIGNALS.free) {
        if (html.includes(signal)) {
            return {
                has_free_tier: true,
                pricing_model: 'freemium', // or 'free' if no paid signals found? Safest is freemium.
                pricing_confidence: 3
            };
        }
    }

    // 2. Check for Free Trial
    for (const signal of SIGNALS.trial) {
        if (html.includes(signal)) {
            return {
                has_free_tier: false, // trials are not free tiers
                pricing_model: 'free_trial',
                pricing_confidence: 2
            };
        }
    }

    // 3. Check for Paid signals
    for (const signal of SIGNALS.paid) {
        if (html.includes(signal)) {
            return {
                has_free_tier: false,
                pricing_model: 'paid',
                pricing_confidence: 2
            };
        }
    }

    return {
        has_free_tier: false,
        pricing_model: 'unknown',
        pricing_confidence: 0
    };
}

/**
 * Process a single tool
 */
async function processTool(tool) {
    console.log(`Processing: ${tool.name} (${tool.website_url})`);

    // Skip if invalid URL
    if (!tool.website_url || !tool.website_url.startsWith('http')) {
        console.log(`Skipping invalid URL for ${tool.name}`);
        return {
            ...tool,
            pricing_detected: false,
            pricing_model: 'unknown',
            pricing_confidence: 0,
            pricing_checked_at: new Date().toISOString().split('T')[0]
        };
    }

    let pricingInfo = {
        pricing_detected: false,
        has_free_tier: false,
        pricing_model: 'unknown',
        pricing_confidence: 0,
        pricing_source: 'unknown',
        pricing_checked_at: new Date().toISOString().split('T')[0]
    };

    try {
        // 1. Fetch Homepage
        const homepageHtml = await fetchUrl(tool.website_url);

        // Check homepage for pricing signals first
        let analysis = analyzeContent(homepageHtml);
        if (analysis.pricing_confidence > 0) {
            pricingInfo = {
                ...pricingInfo,
                ...analysis,
                pricing_detected: true,
                pricing_source: 'homepage'
            };
        }

        // 2. If homepage doesn't give strong "Free Tier" signal, look for pricing page link
        //    (Only if we haven't found a CONFIDENT free tier match yet)
        if (pricingInfo.pricing_confidence < 3) {
            const pricingLinkRegex = /href=["']([^"']*(?:pricing|plans)[^"']*)["']/i;
            const match = homepageHtml.match(pricingLinkRegex);

            if (match) {
                let pricingUrl = match[1];
                // Resolve relative URL
                try {
                    pricingUrl = new URL(pricingUrl, tool.website_url).toString();

                    console.log(`  Fetching pricing page: ${pricingUrl}`);
                    const pricingHtml = await fetchUrl(pricingUrl);
                    const pricingAnalysis = analyzeContent(pricingHtml);

                    // If pricing page gives better or equal confidence, use it
                    if (pricingAnalysis.pricing_confidence >= pricingInfo.pricing_confidence) {
                        pricingInfo = {
                            ...pricingInfo,
                            ...pricingAnalysis,
                            pricing_detected: true,
                            pricing_source: 'pricing_page'
                        };
                    }
                } catch (e) {
                    // Invalid URL construction, ignore
                    console.log(`  Invalid pricing URL detected: ${match[1]}`);
                }
            } else {
                // Try guessing /pricing if no link found
                try {
                    const guessedUrl = new URL('/pricing', tool.website_url).toString();
                    console.log(`  Guessing pricing page: ${guessedUrl}`);
                    const pricingHtml = await fetchUrl(guessedUrl);
                    const pricingAnalysis = analyzeContent(pricingHtml);

                    if (pricingAnalysis.pricing_confidence >= pricingInfo.pricing_confidence) {
                        pricingInfo = {
                            ...pricingInfo,
                            ...pricingAnalysis,
                            pricing_detected: true,
                            pricing_source: 'pricing_page'
                        };
                    }
                } catch (e) {
                    // 404 or other error on guessed URL, ignore
                }
            }
        }

    } catch (error) {
        console.error(`  Failed to fetch ${tool.name}: ${error.message}`);
    }

    // Merge with tool object (preserve existing fields)
    return {
        ...tool,
        ...pricingInfo
    };
}

/**
 * Main execution function
 */
async function main() {
    try {
        // Read tools
        const rawData = fs.readFileSync(TOOLS_FILE, 'utf-8');
        const tools = JSON.parse(rawData);
        console.log(`Loaded ${tools.length} tools for enrichment.`);

        const enrichedTools = [];

        // Process in batches
        for (let i = 0; i < tools.length; i += CONCURRENT_LIMIT) {
            const batch = tools.slice(i, i + CONCURRENT_LIMIT);
            console.log(`\nBatch ${i / CONCURRENT_LIMIT + 1} / ${Math.ceil(tools.length / CONCURRENT_LIMIT)}`);

            const results = await Promise.all(batch.map(tool => processTool(tool)));
            enrichedTools.push(...results);

            // Delay
            if (i + CONCURRENT_LIMIT < tools.length) {
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
            }
        }

        // Write back
        fs.writeFileSync(TOOLS_FILE, JSON.stringify(enrichedTools, null, 2));
        console.log(`\n✅ Successfully enriched ${enrichedTools.length} tools.`);

        // Stats
        const freeTiers = enrichedTools.filter(t => t.has_free_tier).length;
        const detected = enrichedTools.filter(t => t.pricing_detected).length;
        console.log(`Stats: Detected pricing for ${detected}/${enrichedTools.length} tools.`);
        console.log(`Stats: ${freeTiers} tools have a Free Tier.`);

    } catch (error) {
        console.error('Fatal Error:', error);
        process.exit(1);
    }
}

main();
