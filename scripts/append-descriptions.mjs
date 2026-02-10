import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const csvPath = path.join(projectRoot, 'data/tool-descriptions.csv');

/**
 * Append or update descriptions in CSV
 * Usage: node scripts/append-descriptions.mjs '{"id":"chatgpt","short_description":"AI assistant"}'
 * Or pass multiple: node scripts/append-descriptions.mjs '[{"id":"x","short_description":"y"}]'
 */
function appendDescriptions(newEntries) {
    // Read existing CSV
    let existingData = {};
    if (fs.existsSync(csvPath)) {
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = csvContent.trim().split('\n');

        // Parse existing (skip header)
        for (let i = 1; i < lines.length; i++) {
            const [id, ...descParts] = lines[i].split(',');
            if (id) {
                existingData[id.trim()] = descParts.join(',').trim();
            }
        }
    }

    // Add/update new entries
    newEntries.forEach(entry => {
        if (entry.id && entry.short_description) {
            existingData[entry.id] = entry.short_description;
        }
    });

    // Build CSV
    let csvLines = ['id,short_description'];
    Object.entries(existingData).forEach(([id, desc]) => {
        csvLines.push(`${id},${desc}`);
    });

    // Write
    fs.writeFileSync(csvPath, csvLines.join('\n') + '\n');
    console.log(`✅ Updated ${Object.keys(existingData).length} descriptions`);
}

// Parse command line args
const args = process.argv.slice(2);
if (args.length === 0) {
    console.error('Usage: node append-descriptions.mjs \'{"id":"tool-id","short_description":"desc"}\'');
    console.error('Or: node append-descriptions.mjs \'[{...}, {...}]\'');
    process.exit(1);
}

try {
    const input = JSON.parse(args[0]);
    const entries = Array.isArray(input) ? input : [input];
    appendDescriptions(entries);
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}
