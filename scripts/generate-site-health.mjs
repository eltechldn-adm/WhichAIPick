import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORTS_DIR = path.join(__dirname, '../reports');
const SITE_HEALTH_FILE = path.join(REPORTS_DIR, 'SITE_HEALTH.md');

function safeReadJson(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (e) {
        console.warn(`Could not read or parse ${filePath}`);
    }
    return null;
}

const deadLinks = safeReadJson(path.join(REPORTS_DIR, 'dead-links.json')) || [];
const staleTools = safeReadJson(path.join(REPORTS_DIR, 'stale-tools.json')) || [];
const seoHealth = safeReadJson(path.join(REPORTS_DIR, 'seo-health.json')) || { summary: {}, file_issues: [], orphaned_tools: [] };

let md = `# WhichAIPick Site Health Report\n\n`;
md += `*Generated at: ${new Date().toISOString()}*\n\n`;

md += `## Overview\n`;
md += `- **Dead Links Detected**: ${deadLinks.length}\n`;
md += `- **Stale Tools Detected**: ${staleTools.length}\n`;
md += `- **SEO Orphaned Tools**: ${seoHealth.orphaned_tools ? seoHealth.orphaned_tools.length : 0}\n`;
md += `- **SEO File Issues**: ${seoHealth.file_issues ? seoHealth.file_issues.length : 0}\n\n`;

md += `## 1. Dead Links\n`;
if (deadLinks.length === 0) {
    md += `✅ No dead links detected.\n\n`;
} else {
    md += `| Tool ID | Name | Issue |\n`;
    md += `|---|---|---|\n`;
    deadLinks.forEach(tool => {
        let issueStrings = [];
        if (tool.issues.website_url) issueStrings.push(`Official: ${tool.issues.website_url.status} (${tool.issues.website_url.code || tool.issues.website_url.error})`);
        if (tool.issues.affiliate_url) issueStrings.push(`Affiliate: ${tool.issues.affiliate_url.status} (${tool.issues.affiliate_url.code || tool.issues.affiliate_url.error})`);
        md += `| ${tool.id} | ${tool.name} | ${issueStrings.join('<br>')} |\n`;
    });
    md += `\n`;
}

md += `## 2. Stale Tools (Freshness)\n`;
if (staleTools.length === 0) {
    md += `✅ No stale tools detected.\n\n`;
} else {
    md += `| Tool ID | Name | Reason | Eligible |\n`;
    md += `|---|---|---|---|\n`;
    staleTools.forEach(tool => {
        const reasonStr = tool.reason === 'stale' ? `Older than 90 days (${tool.days_since_verified} days)` : 'Missing verification date';
        md += `| ${tool.id} | ${tool.name} | ${reasonStr} | ${tool.recommendationEligible ? 'Yes' : 'No'} |\n`;
    });
    md += `\n`;
}

md += `## 3. SEO Orphans\n`;
if (!seoHealth.orphaned_tools || seoHealth.orphaned_tools.length === 0) {
    md += `✅ No orphaned tools detected.\n\n`;
} else {
    md += `| Tool ID | Name |\n`;
    md += `|---|---|\n`;
    seoHealth.orphaned_tools.forEach(tool => {
        md += `| ${tool.id} | ${tool.name} |\n`;
    });
    md += `\n`;
}

md += `## 4. SEO File Issues\n`;
if (!seoHealth.file_issues || seoHealth.file_issues.length === 0) {
    md += `✅ No SEO file issues detected.\n\n`;
} else {
    // Only show top 50 to avoid massive markdown files
    const displayIssues = seoHealth.file_issues.slice(0, 50);
    md += `*Showing first ${displayIssues.length} of ${seoHealth.file_issues.length} files with issues:*\n\n`;
    displayIssues.forEach(fileIssue => {
        md += `- **${fileIssue.file}**\n`;
        fileIssue.issues.forEach(iss => {
            md += `  - ${iss}\n`;
        });
    });
    md += `\n`;
}

fs.mkdirSync(REPORTS_DIR, { recursive: true });
fs.writeFileSync(SITE_HEALTH_FILE, md, 'utf8');
console.log(`✅ Site Health Report generated at reports/SITE_HEALTH.md`);
