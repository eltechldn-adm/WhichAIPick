import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { chromium } from 'playwright';
import { buildToolPageViewModel } from '../tool-page-2/build-tool-page-view-model.mjs';
import { renderToolPageV2 } from '../tool-page-2/render-tool-page-v2.mjs';

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assert(condition, message) {
    totalChecks++;
    if (condition) {
        passedChecks++;
        console.log(`  ✅ PASS: ${message}`);
    } else {
        failedChecks++;
        console.error(`  ❌ FAIL: ${message}`);
    }
}

function isCommitAncestor(commitSha) {
    try {
        execSync(`git merge-base --is-ancestor ${commitSha} HEAD`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

const PROD_OPTIONS = {
    mode: 'production',
    canonicalUrl: 'https://whichaipick.com/tools/security-test/',
    robots: 'index,follow',
    metaTitle: 'Security Test Tool | WhichAIPick',
    metaDescription: 'Security test description.',
    domain: 'https://whichaipick.com',
    headerHtml: '<header id="site-header"></header>',
    footerHtml: '<footer id="site-footer"></footer>',
    consentHeadHtml: '<!-- consent -->'
};

console.log('======================================================');
console.log('WHICHAIPICK — STAGE 7E.4B-R: RELEASE GATE SECURITY QA');
console.log('======================================================\n');

// 0. GIT ANCESTRY VERIFICATION
console.log('--- 0. GIT ANCESTRY VERIFICATION ---');
const requiredAncestors = [
    ['5a3befadcac9f95f5b95ba756910266a3f223ac3', 'Production baseline 5a3befad'],
    ['25a6c4940ce8a082799a02e3d6aeb127b6083fc4', 'Stage 7E.3A commit 25a6c494'],
    ['9d54edf35a7f71a2189d62167968e93d0ba09585', 'Stage 7E.3B.1 commit 9d54edf3'],
    ['048ff60c915fe4c1fd777fdc31c7747d0189a2d2', 'Stage 7E.3B.2 commit 048ff60c'],
    ['f953042ba0e76228adc773bdd1eebb3db6d55201', 'Stage 7E.3B.3 commit f953042b'],
    ['8f52a549fc351a54401171739487e7a7d9369fe4', 'Stage 7E.4A commit 8f52a549']
];
for (const [sha, label] of requiredAncestors) {
    assert(isCommitAncestor(sha), `${label} is a verified ancestor via git merge-base --is-ancestor`);
}
assert(!isCommitAncestor('0000000000000000000000000000000000000000'), 'Negative ancestry check rejects non-ancestor SHA');

const tools = JSON.parse(fs.readFileSync('data/tools.json', 'utf-8'));
const baseTool = tools.find(t => t.id === 'activepieces') || tools[0];

// 1. JSON-LD SECURITY IN REAL BROWSER (PLAYWRIGHT)
console.log('\n--- 1. JSON-LD SCRIPT BREAKOUT & PARSEABILITY (PLAYWRIGHT) ---');
const XSS_PAYLOAD = '</script><script>window.__v2_xss=1</script>';

const browser = await chromium.launch();
try {
    const page = await browser.newPage();

    const jsonLdCases = [
        {
            label: 'Malicious payload in schema name (preview & production)',
            buildVm: () => buildToolPageViewModel({
                ...baseTool,
                canonicalName: `Tool ${XSS_PAYLOAD}`,
                name: `Tool ${XSS_PAYLOAD}`
            }),
            expectedField: 'name',
            expectedValue: `Tool ${XSS_PAYLOAD}`
        },
        {
            label: 'Malicious payload in schema description via sourceSummary',
            buildVm: () => buildToolPageViewModel({
                ...baseTool,
                sourceSummary: `Summary ${XSS_PAYLOAD}`,
                shortDescription: `Summary ${XSS_PAYLOAD}`,
                description: `Summary ${XSS_PAYLOAD}`
            }),
            expectedField: 'description',
            expectedValue: `Summary ${XSS_PAYLOAD}`
        },
        {
            label: 'Malicious payload in schema URL query parameter',
            buildVm: () => buildToolPageViewModel({
                ...baseTool,
                website_url: `https://example.com/?q=${XSS_PAYLOAD}`
            }),
            expectedField: 'url',
            expectedValue: `https://example.com/?q=${XSS_PAYLOAD}`
        },
        {
            label: 'Malicious payload in schema applicationCategory',
            buildVm: () => buildToolPageViewModel({
                ...baseTool,
                primaryCategory: `Automation ${XSS_PAYLOAD}`
            }),
            expectedField: 'applicationCategory',
            expectedValue: `Automation ${XSS_PAYLOAD}`
        },
        {
            label: 'Malicious payload in schema operatingSystems',
            buildVm: () => {
                const vm = buildToolPageViewModel(baseTool);
                vm.schemaSafe.operatingSystems = [`linux ${XSS_PAYLOAD}`];
                return vm;
            },
            expectedField: 'operatingSystem',
            expectedValue: `linux ${XSS_PAYLOAD}`
        }
    ];

    for (const tc of jsonLdCases) {
        for (const mode of ['preview', 'production']) {
            const vm = tc.buildVm();
            const html = renderToolPageV2(vm, mode === 'production' ? PROD_OPTIONS : null);

            await page.setContent(html, { waitUntil: 'domcontentloaded' });
            const evaluation = await page.evaluate(() => {
                const ldScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
                const inlineExecutableScripts = Array.from(document.querySelectorAll('script:not([type="application/ld+json"]):not([src])'));
                let parsed = null;
                let parseError = null;
                if (ldScripts.length === 1) {
                    try {
                        parsed = JSON.parse(ldScripts[0].textContent);
                    } catch (e) {
                        parseError = e.message;
                    }
                }
                const bodyText = document.body ? document.body.textContent : '';
                return {
                    xssGlobal: window.__v2_xss,
                    ldScriptCount: ldScripts.length,
                    inlineExecutableCount: inlineExecutableScripts.length,
                    parsed,
                    parseError,
                    leakedJsonTailInBody: bodyText.includes('"@context"') || bodyText.includes('"SoftwareApplication"')
                };
            });

            assert(evaluation.xssGlobal === undefined, `[${mode}] ${tc.label}: window.__v2_xss remains undefined`);
            assert(evaluation.ldScriptCount === 1, `[${mode}] ${tc.label}: Exactly 1 JSON-LD script element in DOM`);
            assert(evaluation.inlineExecutableCount === 0, `[${mode}] ${tc.label}: Zero injected inline executable <script> tags`);
            assert(evaluation.parseError === null && evaluation.parsed !== null, `[${mode}] ${tc.label}: JSON-LD remains valid parseable JSON`);
            assert(evaluation.parsed && evaluation.parsed[tc.expectedField] === tc.expectedValue, `[${mode}] ${tc.label}: JSON-LD preserves exact field value after JSON.parse`);
            assert(!evaluation.leakedJsonTailInBody, `[${mode}] ${tc.label}: No broken JSON-LD tail leaked into document body`);
        }
    }

    // 2. OUTBOUND URL SAFETY (VISIT WEBSITE, AFFILIATE, COMPARE CTA)
    console.log('\n--- 2. OUTBOUND URL SCHEME VALIDATION ---');
    const dangerousUrls = [
        'javascript:alert(1)',
        'JAVASCRIPT:alert(document.domain)',
        '   javascript:void(0)',
        'data:text/html,<script>window.__v2_xss=1</script>',
        'file:///etc/passwd',
        '//evil.example.com/phish',
        'ftp://files.example.com/tool.zip',
        'http://',
        'https://',
        'not-a-valid-url'
    ];

    for (const badUrl of dangerousUrls) {
        // 2A. Unsafe website_url with no affiliate_url
        const vmBadWeb = buildToolPageViewModel({
            ...baseTool,
            website_url: badUrl,
            affiliate_url: null
        });
        const htmlBadWeb = renderToolPageV2(vmBadWeb, PROD_OPTIONS);
        await page.setContent(htmlBadWeb, { waitUntil: 'domcontentloaded' });
        const webCheck = await page.evaluate(() => {
            const primaryBtn = document.querySelector('.tool-v2-btn-primary');
            const ld = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
            return {
                hasPrimaryBtn: Boolean(primaryBtn),
                schemaUrl: ld.url || null
            };
        });
        assert(!webCheck.hasPrimaryBtn, `Unsafe website_url "${badUrl}" omits Visit Website CTA`);
        assert(webCheck.schemaUrl === null, `Unsafe website_url "${badUrl}" is excluded from JSON-LD schema.url`);

        // 2B. Unsafe affiliate_url with valid https website_url -> falls back to safe website_url
        const vmBadAff = buildToolPageViewModel({
            ...baseTool,
            website_url: 'https://safe-vendor.example.com/app',
            affiliate_url: badUrl
        });
        const htmlBadAff = renderToolPageV2(vmBadAff, PROD_OPTIONS);
        await page.setContent(htmlBadAff, { waitUntil: 'domcontentloaded' });
        const affFallbackCheck = await page.evaluate(() => {
            const primaryBtn = document.querySelector('.tool-v2-btn-primary');
            const disclosure = document.querySelector('.tool-v2-affiliate-note');
            return {
                href: primaryBtn ? primaryBtn.getAttribute('href') : null,
                rel: primaryBtn ? primaryBtn.getAttribute('rel') : null,
                hasDisclosure: Boolean(disclosure)
            };
        });
        assert(affFallbackCheck.href === 'https://safe-vendor.example.com/app', `Unsafe affiliate_url "${badUrl}" safely falls back to valid website_url`);
        assert(affFallbackCheck.rel === 'noopener noreferrer', `Unsafe affiliate_url "${badUrl}" fallback does not emit sponsored rel`);
        assert(!affFallbackCheck.hasDisclosure, `Unsafe affiliate_url "${badUrl}" fallback does not emit affiliate disclosure`);
    }

    // 2C. Valid HTTPS vendor URL and valid HTTPS affiliate URL
    const vmValidWeb = buildToolPageViewModel({
        ...baseTool,
        website_url: 'https://vendor.example.com/product?plan=pro&tier=1',
        affiliate_url: null
    });
    const htmlValidWeb = renderToolPageV2(vmValidWeb, PROD_OPTIONS);
    await page.setContent(htmlValidWeb, { waitUntil: 'domcontentloaded' });
    const validWebDom = await page.evaluate(() => {
        const btn = document.querySelector('.tool-v2-btn-primary');
        return {
            href: btn ? btn.getAttribute('href') : null,
            rel: btn ? btn.getAttribute('rel') : null,
            target: btn ? btn.getAttribute('target') : null,
            hasDisclosure: Boolean(document.querySelector('.tool-v2-affiliate-note'))
        };
    });
    assert(validWebDom.href === 'https://vendor.example.com/product?plan=pro&tier=1', 'Valid HTTPS website_url preserved with query parameters');
    assert(validWebDom.rel === 'noopener noreferrer' && validWebDom.target === '_blank', 'Valid HTTPS website_url has target="_blank" rel="noopener noreferrer"');
    assert(!validWebDom.hasDisclosure, 'Non-affiliate tool omits affiliate disclosure');

    const vmValidAff = buildToolPageViewModel({
        ...baseTool,
        website_url: 'https://vendor.example.com',
        affiliate_url: 'https://partner.example.com/track?ref=whichaipick&subid=v2'
    });
    const htmlValidAff = renderToolPageV2(vmValidAff, PROD_OPTIONS);
    await page.setContent(htmlValidAff, { waitUntil: 'domcontentloaded' });
    const validAffDom = await page.evaluate(() => {
        const btn = document.querySelector('.tool-v2-btn-primary');
        const disclosureLink = document.querySelector('.tool-v2-affiliate-note a');
        return {
            href: btn ? btn.getAttribute('href') : null,
            rel: btn ? btn.getAttribute('rel') : null,
            hasDisclosure: Boolean(document.querySelector('.tool-v2-affiliate-note')),
            disclosureHref: disclosureLink ? disclosureLink.getAttribute('href') : null
        };
    });
    assert(validAffDom.href === 'https://partner.example.com/track?ref=whichaipick&subid=v2', 'Valid HTTPS affiliate_url selected and preserves tracking params');
    assert(validAffDom.rel === 'sponsored noopener noreferrer', 'Valid HTTPS affiliate_url includes sponsored noopener noreferrer rel');
    assert(validAffDom.hasDisclosure && validAffDom.disclosureHref === '/disclosure.html', 'Valid HTTPS affiliate_url renders affiliate disclosure linking to /disclosure.html');

    // 2D. Compare CTA safety with normal and malicious synthetic tool IDs
    const vmCompareMalicious = buildToolPageViewModel({
        ...baseTool,
        id: 'javascript:alert(1)" onclick="window.__v2_xss=1'
    });
    const htmlCompareMalicious = renderToolPageV2(vmCompareMalicious, PROD_OPTIONS);
    await page.setContent(htmlCompareMalicious, { waitUntil: 'domcontentloaded' });
    const compareDom = await page.evaluate(() => {
        const compareLink = document.querySelector('a.tool-v2-btn-secondary');
        const shortlistBtn = document.querySelector('button.tool-v2-btn-shortlist');
        return {
            href: compareLink ? compareLink.getAttribute('href') : null,
            onclick: compareLink ? compareLink.getAttribute('onclick') : null,
            btnOnclick: shortlistBtn ? shortlistBtn.getAttribute('onclick') : null,
            xss: window.__v2_xss
        };
    });
    assert(compareDom.href && compareDom.href.startsWith('/compare#tools='), 'Compare CTA always uses root-relative /compare#tools= path');
    assert(!compareDom.href.includes('"') && compareDom.onclick === null && compareDom.btnOnclick === null, 'Compare CTA and Shortlist button block attribute breakout and inline onclick');
    assert(compareDom.xss === undefined, 'window.__v2_xss remains undefined after rendering malicious tool ID');

} finally {
    await browser.close();
}

console.log('\n======================================================');
console.log(`SECURITY QA COMPLETE: ${passedChecks}/${totalChecks} CHECKS PASSED`);
if (failedChecks > 0) {
    console.error(`💥 ${failedChecks} CHECKS FAILED!`);
    process.exit(1);
} else {
    console.log('🎉 ALL RELEASE GATE SECURITY CHECKS PASSED!');
    console.log('======================================================\n');
}
