import fs from 'fs';
const tools = JSON.parse(fs.readFileSync('./data/tools.json', 'utf8'));
const enrichedTools = tools.slice(250, 300);
const ids = enrichedTools.map(t => t.id);

let valid = true;
let missingFields = 0;
const expectedCoreFields = ['id', 'name', 'website_url', 'pricing_model', 'category'];
const expectedNewFields = ['long_description', 'how_it_works', 'workflows', 'feature_groups', 'best_for', 'pros', 'cons', 'pricing_overview', 'comparison_summary'];

for (const t of enrichedTools) {
    for (const f of expectedCoreFields) {
        if (!t[f]) { valid = false; console.error('Missing core field', f, 'in', t.id); }
    }
    for (const f of expectedNewFields) {
        if (!t[f]) { valid = false; missingFields++; console.error('Missing new field', f, 'in', t.id); }
    }
}
console.log('IDs:', ids.join(', '));
console.log('Valid:', valid, 'Enriched count:', enrichedTools.length);
