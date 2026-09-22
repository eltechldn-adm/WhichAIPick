import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '../');
const TOOLS_JSON_FILE = path.join(__dirname, '../data/tools.json');
const REPORT_FILE = path.join(__dirname, '../reports/seo-health.json');

let errors = 0;
let warnings = 0;

const seoIssues = [];
const internalLinks = new Set();

function checkHTMLFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(ROOT_DIR, filePath);
    const fileIssues = [];

    // Find internal links (href="/tools/id/")
    const linkRegex = /href="\/tools\/([^/"]+)\/"/g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
        internalLinks.add(match[1]); // The tool ID
    }

    // Check title
    const titleMatch = content.match(/<title>(.*?)<\/title>/);
    if (!titleMatch || !titleMatch[1].trim()) {
        fileIssues.push('Missing or empty <title>');
        errors++;
    }

    // Check meta description
    const descMatch = content.match(/<meta name="description" content="([^"]+)">/);
    if (!descMatch || !descMatch[1].trim()) {
        fileIssues.push('Missing or empty <meta name="description">');
        warnings++; // Treating as warning
    }

    // Check H1
    const h1Matches = [...content.matchAll(/<h1[^>]*>(.*?)<\/h1>/gi)];
    if (h1Matches.length === 0) {
        fileIssues.push('Missing <h1>');
        errors++;
    } else if (h1Matches.length > 1) {
        fileIssues.push(`Multiple <h1> tags (${h1Matches.length})`);
        errors++;
    }

    // Check JSON-LD
    if (!content.includes('type="application/ld+json"')) {
        fileIssues.push('Missing JSON-LD structured data');
        warnings++;
    }

    if (fileIssues.length > 0) {
        seoIssues.push({
            file: relativePath,
            issues: fileIssues
        });
    }
}

function walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else if (f.endsWith('.html')) {
            callback(dirPath);
        }
    });
}

console.log('🔍 Running SEO Health Audit...');

const directoriesToCheck = ['tools', 'categories', 'best-ai-tools', 'alternatives', 'compare', 'guides', 'shortlist'];
directoriesToCheck.forEach(d => {
    walkDir(path.join(ROOT_DIR, d), checkHTMLFile);
});
checkHTMLFile(path.join(ROOT_DIR, 'index.html'));
if (fs.existsSync(path.join(ROOT_DIR, 'my-tools', 'index.html'))) {
    checkHTMLFile(path.join(ROOT_DIR, 'my-tools', 'index.html'));
}

// Check for orphans
const toolsJson = JSON.parse(fs.readFileSync(TOOLS_JSON_FILE, 'utf8'));
const activeTools = toolsJson.filter(t => t.operationalStatus === 'active');
const orphanedTools = [];

activeTools.forEach(tool => {
    if (!internalLinks.has(tool.id)) {
        orphanedTools.push({
            id: tool.id,
            name: tool.name
        });
        warnings++;
        seoIssues.push({
            file: `/tools/${tool.id}/index.html`,
            issues: [`[DEFERRED] Orphaned Tool: No internal links point to /tools/${tool.id}/ (Remediation deferred until final catalogue import)`]
        });
    }
});

console.log(`\n==================================================`);
console.log(`SEO Health Audit Complete`);
console.log(`Total HTML files checked: ${seoIssues.length} have issues.`);
console.log(`Errors: ${errors} | Warnings: ${warnings}`);
console.log(`Orphaned Tools: ${orphanedTools.length}`);
console.log(`==================================================`);

const reportData = {
    summary: { errors, warnings, orphaned_count: orphanedTools.length },
    orphaned_tools: orphanedTools,
    file_issues: seoIssues
};

fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
fs.writeFileSync(REPORT_FILE, JSON.stringify(reportData, null, 2), 'utf8');
console.log(`Report written to ${REPORT_FILE}`);

if (errors > 0) {
    console.error('\n[FAILED] SEO health audit failed due to errors.');
    process.exit(1);
} else {
    console.log('\n[SUCCESS] SEO health audit passed.');
    process.exit(0);
}
