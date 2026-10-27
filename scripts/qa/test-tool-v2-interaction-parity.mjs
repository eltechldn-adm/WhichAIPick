import http from 'http';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.xml': 'application/xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8'
};

function createStaticServer(root) {
    return http.createServer((req, res) => {
        try {
            const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
            let filePath = path.join(root, urlPath);

            // Directory / clean route resolution
            if (urlPath === '/compare' || urlPath === '/compare/') {
                filePath = path.join(root, 'compare.html');
            } else if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
                filePath = path.join(filePath, 'index.html');
            } else if (!fs.existsSync(filePath)) {
                if (urlPath.endsWith('/')) {
                    filePath = path.join(root, urlPath, 'index.html');
                } else if (fs.existsSync(filePath + '.html')) {
                    filePath = filePath + '.html';
                }
            }

            if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end(`404 Not Found: ${urlPath}`);
                return;
            }

            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';
            const content = fs.readFileSync(filePath);
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(`500 Server Error: ${err.message}`);
        }
    });
}

const checks = [];
function recordCheck(section, description, passed, detail = '') {
    checks.push({ section, description, passed, detail });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${mark}: [${section}] ${description} ${detail ? `(${detail})` : ''}`);
    if (!passed) {
        throw new Error(`[${section}] Assertion failed: ${description}. ${detail}`);
    }
}

async function run() {
    console.log('\n======================================================');
    console.log('STAGE 7E.3A — TOOL PAGE V2 INTERACTION PARITY TEST SUITE');
    console.log('======================================================\n');

    // 1. Verify V2 canary pages exist
    const canaryIds = ['aider', 'activepieces', 'akiflow', 'adcreativeai', 'mindgrasp', 'crawl4ai'];
    for (const id of canaryIds) {
        const file = path.join(ROOT, 'tools', id, 'index.html');
        assert(fs.existsSync(file), `Canary page missing: ${file}`);
        const html = fs.readFileSync(file, 'utf8');
        assert(html.includes('class="tool-page-v2"'), `Page ${id} is not V2 template`);
        assert(html.includes('shortlist-toggle-btn'), `Page ${id} missing shortlist-toggle-btn`);
        assert(html.includes(`data-tool-id="${id}"`), `Page ${id} missing data-tool-id`);
    }
    console.log(`Precondition passed: All 6 canary pages verified on disk with V2 template & shortlist markup.\n`);

    // 2. Start HTTP server
    const server = createStaticServer(ROOT);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`Local test server listening on ${baseUrl}\n`);

    const browser = await chromium.launch({ headless: true });

    try {
        // ====================================================================
        // TEST A: COMPARE CTA & INTERACTION
        // ====================================================================
        console.log('--- TEST A: COMPARE INTERACTION ---');
        const contextA = await browser.newContext();
        const pageA = await contextA.newPage();

        // Step A1: Navigate to V2 Aider page
        await pageA.goto(`${baseUrl}/tools/aider/`, { waitUntil: 'domcontentloaded' });

        const compareCta = pageA.locator('.tool-v2-cta-group a.tool-v2-btn-secondary');
        const compareCount = await compareCta.count();
        recordCheck('A1', 'Compare CTA exists in V2 hero', compareCount === 1, `count=${compareCount}`);

        const compareHref = await compareCta.getAttribute('href');
        recordCheck('A2', 'Compare CTA links to /compare#tools=aider', compareHref === '/compare#tools=aider', `href=${compareHref}`);

        const compareText = (await compareCta.textContent()).trim();
        recordCheck('A3', 'Compare CTA has accessible label', compareText === 'Compare Aider', `text=${compareText}`);

        // Step A2: Click the Compare CTA
        await compareCta.click();
        await pageA.waitForURL(/.*\/compare#tools=aider/);
        recordCheck('A4', 'Navigated successfully to /compare#tools=aider', pageA.url().endsWith('/compare#tools=aider'), `url=${pageA.url()}`);

        // Step A3: Wait for Compare Engine to initialize and render empty state with preselected tool
        await pageA.waitForSelector('#compare-empty-state', { state: 'visible' });
        const emptyStateText = await pageA.locator('#compare-empty-state').textContent();
        recordCheck('A5', 'Comparison engine detects single tool "Aider"', emptyStateText.includes('You have selected Aider'), `preview=${emptyStateText.replace(/\s+/g, ' ').slice(0, 80)}`);

        // Step A4: Verify "Add another tool" button exists and click it
        const addAnotherBtn = pageA.locator('#compare-empty-state button:has-text("Add another tool")');
        recordCheck('A6', '"Add another tool" button is visible', await addAnotherBtn.isVisible());
        await addAnotherBtn.click();

        // Step A5: Verify selector modal opens
        const selectorModal = pageA.locator('#compare-selector-modal');
        await pageA.waitForSelector('#compare-selector-modal', { state: 'visible' });
        recordCheck('A7', 'Selector modal opened successfully', await selectorModal.isVisible());

        // Step A6: Search and select a second tool (Cursor)
        const selectorInput = pageA.locator('#compare-selector-input');
        await selectorInput.fill('Cursor');
        await pageA.waitForSelector('.selector-result-btn:has-text("Cursor")', { state: 'visible' });
        const cursorBtn = pageA.locator('.selector-result-btn:has-text("Cursor")').first();
        await cursorBtn.click();

        // Step A7: Verify side-by-side comparison table renders both tools
        await pageA.waitForSelector('#compare-table-container', { state: 'visible' });
        const tableVisible = await pageA.locator('#compare-table-container').isVisible();
        recordCheck('A8', 'Side-by-side comparison table is displayed', tableVisible);

        const currentHash = new URL(pageA.url()).hash;
        recordCheck('A9', 'URL hash updated to include both tools', currentHash.includes('aider') && currentHash.includes('cursor'), `hash=${currentHash}`);

        const tableText = await pageA.locator('#compare-table-container').textContent();
        recordCheck('A10', 'Table includes columns for both Aider and Cursor', tableText.includes('Aider') && tableText.includes('Cursor'));

        await contextA.close();
        console.log('--- TEST A PASSED ---\n');

        // ====================================================================
        // TEST B: SHORTLIST (SAVE TO MY TOOLS)
        // ====================================================================
        console.log('--- TEST B: SHORTLIST INTERACTION & PERSISTENCE ---');
        const contextB = await browser.newContext();
        const pageB = await contextB.newPage();

        // Step B1: Clear storage and load V2 Aider
        await pageB.goto(`${baseUrl}/tools/aider/`, { waitUntil: 'networkidle' });
        await pageB.evaluate(() => localStorage.clear());
        await pageB.reload({ waitUntil: 'networkidle' });

        const shortlistBtn = pageB.locator('.tool-v2-cta-group button.shortlist-toggle-btn');
        recordCheck('B1', 'Shortlist button exists with type="button"', await shortlistBtn.getAttribute('type') === 'button');
        recordCheck('B2', 'Shortlist button has data-tool-id="aider"', await shortlistBtn.getAttribute('data-tool-id') === 'aider');

        const initialBtnText = (await shortlistBtn.textContent()).trim();
        const initialHasSavedClass = await shortlistBtn.evaluate(el => el.classList.contains('saved'));
        recordCheck('B3', 'Shortlist button initially shows unsaved state', initialBtnText === 'Save' && !initialHasSavedClass, `text=${initialBtnText}`);

        // Initial header badge
        const initialBadgeDisplay = await pageB.locator('#header-shortlist-link').evaluate(el => window.getComputedStyle(el).display);
        recordCheck('B4', 'Header shortlist badge hidden when empty', initialBadgeDisplay === 'none', `display=${initialBadgeDisplay}`);

        // Step B2: Click shortlist button to save
        await shortlistBtn.click();
        await pageB.waitForTimeout(100);

        const savedBtnText = (await shortlistBtn.textContent()).trim();
        const savedHasSavedClass = await shortlistBtn.evaluate(el => el.classList.contains('saved'));
        recordCheck('B5', 'Button switches to saved state (.saved class + "Saved" text)', savedBtnText === 'Saved' && savedHasSavedClass, `text=${savedBtnText}`);

        // Verify localStorage
        const storageStateAfterSave = await pageB.evaluate(() => JSON.parse(localStorage.getItem('whichaipick_user_state') || '{}'));
        recordCheck('B6', 'localStorage.whichaipick_user_state.savedToolIds contains "aider"', Array.isArray(storageStateAfterSave.savedToolIds) && storageStateAfterSave.savedToolIds.includes('aider'), `savedIds=${JSON.stringify(storageStateAfterSave.savedToolIds)}`);

        // Verify header badge updated
        const badgeCount = await pageB.locator('#header-shortlist-badge').textContent();
        const badgeLinkDisplay = await pageB.locator('#header-shortlist-link').evaluate(el => window.getComputedStyle(el).display);
        recordCheck('B7', 'Header badge updated to count=1 and is visible', badgeCount === '1' && badgeLinkDisplay !== 'none', `badgeCount=${badgeCount}, display=${badgeLinkDisplay}`);

        // Step B3: Reload page and confirm persistence
        await pageB.reload({ waitUntil: 'networkidle' });
        const reloadedBtnText = (await pageB.locator('.tool-v2-cta-group button.shortlist-toggle-btn').textContent()).trim();
        const reloadedHasSavedClass = await pageB.locator('.tool-v2-cta-group button.shortlist-toggle-btn').evaluate(el => el.classList.contains('saved'));
        const reloadedBadge = await pageB.locator('#header-shortlist-badge').textContent();
        recordCheck('B8', 'Saved state persists across full page reload', reloadedBtnText === 'Saved' && reloadedHasSavedClass && reloadedBadge === '1', `reloadedText=${reloadedBtnText}`);

        // Step B4: Verify My Tools page renders the saved tool
        await pageB.goto(`${baseUrl}/my-tools/`, { waitUntil: 'networkidle' });
        const myToolsText = await pageB.locator('#my-tools-content').textContent();
        recordCheck('B9', 'My Tools page displays "Aider" in saved tools', myToolsText.includes('Aider'));

        // Step B5: Return to Aider and unsave
        await pageB.goto(`${baseUrl}/tools/aider/`, { waitUntil: 'networkidle' });
        const removeShortlistBtn = pageB.locator('.tool-v2-cta-group button.shortlist-toggle-btn');
        await removeShortlistBtn.click();
        await pageB.waitForTimeout(100);

        const unsavedBtnText = (await removeShortlistBtn.textContent()).trim();
        const unsavedHasClass = await removeShortlistBtn.evaluate(el => el.classList.contains('saved'));
        recordCheck('B10', 'Button reverts to unsaved state on second click', unsavedBtnText === 'Save' && !unsavedHasClass);

        const storageStateAfterUnsave = await pageB.evaluate(() => JSON.parse(localStorage.getItem('whichaipick_user_state') || '{}'));
        recordCheck('B11', 'Tool removed from localStorage.whichaipick_user_state', !storageStateAfterUnsave.savedToolIds.includes('aider'));

        const postUnsaveBadgeDisplay = await pageB.locator('#header-shortlist-link').evaluate(el => window.getComputedStyle(el).display);
        recordCheck('B12', 'Header badge hidden after removing tool', postUnsaveBadgeDisplay === 'none');

        // Verify My Tools empty state
        await pageB.goto(`${baseUrl}/my-tools/`, { waitUntil: 'networkidle' });
        const myToolsEmptyText = await pageB.locator('#my-tools-content').textContent();
        recordCheck('B13', 'My Tools reflects removal of tool', !myToolsEmptyText.includes('Aider') || myToolsEmptyText.includes('No saved tools'));

        await contextB.close();
        console.log('--- TEST B PASSED ---\n');

        // ====================================================================
        // TEST C: ACCESSIBILITY & MOBILE RESPONSIVENESS (1280px and 390px)
        // ====================================================================
        console.log('--- TEST C: ACCESSIBILITY & RESPONSIVENESS ---');

        for (const vp of [{ width: 1280, height: 800, name: 'Desktop (1280px)' }, { width: 390, height: 844, name: 'Mobile (390px)' }]) {
            console.log(`Checking viewport: ${vp.name}...`);
            const contextC = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
            const pageC = await contextC.newPage();

            const consoleErrors = [];
            pageC.on('console', msg => {
                if (msg.type() === 'error') consoleErrors.push(msg.text());
            });

            await pageC.goto(`${baseUrl}/tools/aider/`, { waitUntil: 'networkidle' });

            // Horizontal overflow check
            const overflow = await pageC.evaluate(() => {
                return {
                    scrollWidth: document.documentElement.scrollWidth,
                    clientWidth: document.documentElement.clientWidth,
                    innerWidth: window.innerWidth
                };
            });
            recordCheck(`C-${vp.width}`, `No horizontal overflow at ${vp.width}px`, overflow.scrollWidth <= vp.width, `scrollWidth=${overflow.scrollWidth}, innerWidth=${overflow.innerWidth}`);

            // CTA visibility
            const primaryCta = pageC.locator('.tool-v2-cta-group a.tool-v2-btn-primary');
            const compCta = pageC.locator('.tool-v2-cta-group a.tool-v2-btn-secondary');
            const saveBtn = pageC.locator('.tool-v2-cta-group button.shortlist-toggle-btn');

            recordCheck(`C-${vp.width}`, `Primary CTA visible at ${vp.width}px`, await primaryCta.isVisible());
            recordCheck(`C-${vp.width}`, `Compare CTA visible at ${vp.width}px`, await compCta.isVisible());
            recordCheck(`C-${vp.width}`, `Save CTA visible at ${vp.width}px`, await saveBtn.isVisible());

            // Touch target height
            const saveBox = await saveBtn.boundingBox();
            const compBox = await compCta.boundingBox();
            const primBox = await primaryCta.boundingBox();

            recordCheck(`C-${vp.width}`, `Primary CTA touch target height >= 44px`, primBox.height >= 44, `height=${primBox.height}`);
            recordCheck(`C-${vp.width}`, `Compare CTA touch target height >= 44px`, compBox.height >= 44, `height=${compBox.height}`);
            recordCheck(`C-${vp.width}`, `Save CTA touch target height >= 44px`, saveBox.height >= 44, `height=${saveBox.height}`);

            // Accessible name
            const accessibleName = await saveBtn.evaluate(el => el.getAttribute('aria-label') || el.innerText);
            recordCheck(`C-${vp.width}`, `Shortlist button has non-empty accessible name`, !!accessibleName && accessibleName.length > 3, `name="${accessibleName}"`);

            // Keyboard focus
            await saveBtn.focus();
            const activeTag = await pageC.evaluate(() => document.activeElement.tagName.toLowerCase());
            const activeId = await pageC.evaluate(() => document.activeElement.getAttribute('data-tool-id'));
            recordCheck(`C-${vp.width}`, `Shortlist button receives keyboard focus`, activeTag === 'button' && activeId === 'aider');

            // Console errors
            recordCheck(`C-${vp.width}`, `Zero uncaught console errors at ${vp.width}px`, consoleErrors.length === 0, `errors=${consoleErrors.join('; ')}`);

            await contextC.close();
        }
        console.log('--- TEST C PASSED ---\n');

        // ====================================================================
        // TEST D: V1 REGRESSION VERIFICATION (Unchanged V1 Shortlist Behavior)
        // ====================================================================
        console.log('--- TEST D: V1 SHORTLIST REGRESSION CHECK ---');
        const contextD = await browser.newContext();
        const pageD = await contextD.newPage();

        await pageD.goto(`${baseUrl}/tools/chatgpt/`, { waitUntil: 'networkidle' });
        await pageD.evaluate(() => localStorage.clear());
        await pageD.reload({ waitUntil: 'networkidle' });

        const v1Btn = pageD.locator('button.shortlist-toggle-btn[data-tool-id="chatgpt"]');
        recordCheck('D1', 'V1 shortlist button present on /tools/chatgpt/', await v1Btn.count() === 1);

        await v1Btn.click();
        await pageD.waitForTimeout(100);

        const v1Storage = await pageD.evaluate(() => JSON.parse(localStorage.getItem('whichaipick_user_state') || '{}'));
        recordCheck('D2', 'V1 tool save updates localStorage', v1Storage.savedToolIds && v1Storage.savedToolIds.includes('chatgpt'));

        await v1Btn.click();
        await pageD.waitForTimeout(100);

        const v1StorageAfter = await pageD.evaluate(() => JSON.parse(localStorage.getItem('whichaipick_user_state') || '{}'));
        recordCheck('D3', 'V1 tool unsave removes from localStorage', !v1StorageAfter.savedToolIds.includes('chatgpt'));

        await contextD.close();
        console.log('--- TEST D PASSED ---\n');

    } finally {
        await browser.close();
        await new Promise((resolve) => server.close(resolve));
        console.log('Local test server stopped.');
    }

    console.log(`\n======================================================`);
    console.log(`🎉 ALL ${checks.length} FUNCTIONAL REGRESSION CHECKS PASSED!`);
    console.log(`======================================================\n`);
}

run().catch((err) => {
    console.error(`\n❌ REGRESSION TEST FAILED: ${err.message}`);
    process.exit(1);
});
