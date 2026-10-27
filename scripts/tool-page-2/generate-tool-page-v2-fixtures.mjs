import fs from 'fs';
import path from 'path';
import { buildToolPageViewModel } from './build-tool-page-view-model.mjs';
import { renderToolPageV2 } from './render-tool-page-v2.mjs';

const STAGED_PATH = path.resolve('data/tools.phase11.staged.json');
const LEDGER_PATH = path.resolve('data/evidence/phase11-evidence-ledger.json');
const OUT_DIR = path.resolve('tool-page-v2-preview');

if (!fs.existsSync(STAGED_PATH)) {
    console.error(`File not found: ${STAGED_PATH}`);
    process.exit(1);
}

const rawData = JSON.parse(fs.readFileSync(STAGED_PATH, 'utf8'));

let ledgerData = [];
if (fs.existsSync(LEDGER_PATH)) {
    ledgerData = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
}

const fixtures = ['chatgpt', 'midjourney', 'cursor', 'zapier-ai', 'aider', 'amazon-codewhisperer'];

if (fixtures.length !== 6) {
    console.error('Hard fail: Fixture count is not exactly 6.');
    process.exit(1);
}

const comparisonsMap = {
    'chatgpt': [
        { title: 'ChatGPT vs Claude', url: '/compare/chatgpt-vs-claude/' },
        { title: 'ChatGPT vs Gemini', url: '/compare/chatgpt-vs-gemini/' },
        { title: 'ChatGPT vs Perplexity', url: '/compare/chatgpt-vs-perplexity/' },
        { title: 'Midjourney vs ChatGPT Images', url: '/compare/midjourney-vs-chatgpt-images/' }
    ],
    'midjourney': [
        { title: 'Midjourney vs Leonardo AI', url: '/compare/midjourney-vs-leonardo-ai/' },
        { title: 'Midjourney vs ChatGPT Images', url: '/compare/midjourney-vs-chatgpt-images/' }
    ],
    'cursor': [
        { title: 'Cursor vs GitHub Copilot', url: '/compare/cursor-vs-github-copilot/' }
    ],
    'zapier-ai': [],
    'aider': [],
    'amazon-codewhisperer': []
};

if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
}

for (const id of fixtures) {
    const tool = rawData.find(t => t.id === id);
    if (!tool) {
        console.error(`Tool fixture not found: ${id}`);
        process.exit(1);
    }

    let evidenceReviewedAt = null;
    if (Array.isArray(tool.evidenceIds) && tool.evidenceIds.length > 0) {
        let latestDate = null;
        for (const evId of tool.evidenceIds) {
            const row = ledgerData.find(r => r.evidenceId === evId && r.id === tool.id);
            if (row && row.reviewedAt) {
                const rowDate = new Date(row.reviewedAt);
                if (!latestDate || rowDate > latestDate) {
                    latestDate = rowDate;
                }
            }
        }
        if (latestDate) {
            evidenceReviewedAt = latestDate.toISOString().split('T')[0]; // Simple formatting for now
        }
    }

    const viewModel = buildToolPageViewModel(tool, {
        evidenceReviewedAt,
        featuredComparisons: comparisonsMap[id] || []
    });

    const html = renderToolPageV2(viewModel);

    const toolDir = path.join(OUT_DIR, id);
    if (!fs.existsSync(toolDir)) {
        fs.mkdirSync(toolDir, { recursive: true });
    }

    fs.writeFileSync(path.join(toolDir, 'index.html'), html);
    console.log(`Generated: ${toolDir}/index.html`);
}
