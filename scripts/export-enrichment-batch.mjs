import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Paths
const toolsJsonPath = path.join(projectRoot, 'data/tools.json');
const outputPath = path.join(projectRoot, 'data/enrichment-batch.json');

async function exportEnrichmentBatch() {
    console.log('📦 Exporting enrichment batch...\n');

    try {
        // Read tools.json
        const toolsData = JSON.parse(fs.readFileSync(toolsJsonPath, 'utf-8'));

        // Sort by name A-Z
        const sortedTools = toolsData.sort((a, b) => a.name.localeCompare(b.name));

        // Take first 30
        const batch = sortedTools.slice(0, 30);

        // Map to enrichment format
        const enrichmentBatch = batch.map(tool => ({
            id: tool.id,
            name: tool.name,
            website_url: tool.website_url,
            category: tool.category || 'Uncategorized'
        }));

        // Write output
        fs.writeFileSync(outputPath, JSON.stringify(enrichmentBatch, null, 2));

        console.log(`✅ Exported ${enrichmentBatch.length} tools to enrichment-batch.json`);
        console.log('\nFirst 5 tools:');
        enrichmentBatch.slice(0, 5).forEach((tool, idx) => {
            console.log(`  ${idx + 1}. ${tool.name} (${tool.id})`);
        });
        console.log(`  ...\n`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

exportEnrichmentBatch();
