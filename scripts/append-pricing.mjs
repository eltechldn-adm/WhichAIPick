import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const csvPath = path.join(projectRoot, 'data/tool-pricing.csv');

/**
 * Append or update pricing in CSV
 * Usage: node scripts/append-pricing.mjs '{"id":"chatgpt","has_free_tier":"yes","starting_price":"20","price_currency":"USD","pricing_model":"subscription","notes":"Plus plan"}'
 * Or pass multiple: node scripts/append-pricing.mjs '[{...}, {...}]'
 */
function appendPricing(newEntries) {
    // Read existing CSV
    let existingData = {};
    if (fs.existsSync(csvPath)) {
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = csvContent.trim().split('\n');
        const headers = lines[0].split(',');

        // Parse existing (skip header)
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const id = values[0]?.trim();
            if (id) {
                existingData[id] = {
                    has_free_tier: values[1] || '',
                    starting_price: values[2] || '',
                    price_currency: values[3] || '',
                    pricing_model: values[4] || '',
                    notes: values[5] || ''
                };
            }
        }
    }

    // Add/update new entries
    newEntries.forEach(entry => {
        if (entry.id) {
            existingData[entry.id] = {
                has_free_tier: entry.has_free_tier || 'unknown',
                starting_price: entry.starting_price || '',
                price_currency: entry.price_currency || '',
                pricing_model: entry.pricing_model || 'unknown',
                notes: entry.notes || ''
            };
        }
    });

    // Build CSV
    let csvLines = ['id,has_free_tier,starting_price,price_currency,pricing_model,notes'];
    Object.entries(existingData).forEach(([id, data]) => {
        csvLines.push(`${id},${data.has_free_tier},${data.starting_price},${data.price_currency},${data.pricing_model},${data.notes}`);
    });

    // Write
    fs.writeFileSync(csvPath, csvLines.join('\n') + '\n');
    console.log(`✅ Updated ${Object.keys(existingData).length} pricing entries`);
}

// Parse command line args
const args = process.argv.slice(2);
if (args.length === 0) {
    console.error('Usage: node append-pricing.mjs \'{"id":"tool-id","has_free_tier":"yes","starting_price":"20",...}\'');
    console.error('Or: node append-pricing.mjs \'[{...}, {...}]\'');
    process.exit(1);
}

try {
    const input = JSON.parse(args[0]);
    const entries = Array.isArray(input) ? input : [input];
    appendPricing(entries);
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}
