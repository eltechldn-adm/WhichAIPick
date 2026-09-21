import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const TARGET_DIRS = ['best-ai-tools', 'alternatives', 'compare', 'guides'];

function getFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getFiles(filePath, fileList);
        } else if (filePath.endsWith('.html')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const allPages = [];

for (const dir of TARGET_DIRS) {
    const fullDirPath = path.join(ROOT_DIR, dir);
    const htmlFiles = getFiles(fullDirPath);

    for (const filePath of htmlFiles) {
        const html = fs.readFileSync(filePath, 'utf-8');
        const $ = cheerio.load(html);
        
        let url = filePath.replace(ROOT_DIR, '').replace(/\\/g, '/');
        if (url.endsWith('index.html')) url = url.replace('index.html', '');

        const indexability = $('meta[name="robots"]').attr('content') || 'Missing';
        const canonical = $('link[rel="canonical"]').attr('href') || 'Missing';
        const title = $('title').text() || 'Missing';
        const h1 = $('h1').first().text().trim() || 'Missing';
        const metaDesc = $('meta[name="description"]').attr('content') || 'Missing';
        const pageType = dir;
        const toolCount = $('.tool-card').length;
        
        // We look for .seo-breadcrumbs or nav[aria-label="Breadcrumb"]
        let breadcrumbText = '';
        const $bc = $('.seo-breadcrumbs').length ? $('.seo-breadcrumbs') : $('nav[aria-label="Breadcrumb"]');
        if ($bc.length) {
            $bc.find('script').remove();
            breadcrumbText = $bc.text().trim();
        }
        const hasBreadcrumbs = breadcrumbText.length > 0;
        
        const schemas = [];
        $('script[type="application/ld+json"]').each((i, el) => {
            try {
                const data = JSON.parse($(el).html());
                if (Array.isArray(data)) {
                    data.forEach(s => schemas.push(s['@type']));
                } else if (data['@graph']) {
                    data['@graph'].forEach(s => schemas.push(s['@type']));
                } else {
                    schemas.push(data['@type']);
                }
            } catch (e) {
                schemas.push('Invalid JSON-LD');
            }
        });

        allPages.push({
            URL: url,
            indexability,
            canonical,
            title,
            H1: h1,
            metaDescription: metaDesc,
            pageType,
            toolCount,
            breadcrumbPresence: hasBreadcrumbs,
            breadcrumbText: breadcrumbText.replace(/\s+/g, ' ').substring(0, 100),
            schemaTypes: [...new Set(schemas)].join(', ')
        });
    }
}

console.log(JSON.stringify(allPages, null, 2));
