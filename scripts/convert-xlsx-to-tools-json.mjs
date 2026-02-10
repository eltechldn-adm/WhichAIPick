import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, '../data/URLs_for_Which_AI_Tool_UPDATED.xlsx');
const OUTPUT_FILE = path.join(__dirname, '../data/tools.json');
const TAXONOMY_FILE = path.join(__dirname, '../data/category-taxonomy.json');
const MAPPING_FILE = path.join(__dirname, '../data/tool-categories.csv');

// Load category taxonomy
let allowedCategories = [];
if (fs.existsSync(TAXONOMY_FILE)) {
    console.log('📚 Loading category taxonomy...');
    const taxonomyData = fs.readFileSync(TAXONOMY_FILE, 'utf8');
    allowedCategories = JSON.parse(taxonomyData);
    console.log(`✅ Loaded ${allowedCategories.length} allowed categories`);
} else {
    console.log('⚠️  No taxonomy file found, all tools will be Uncategorized');
}

// Load category mappings
const categoryMap = new Map();
if (fs.existsSync(MAPPING_FILE)) {
    console.log('🗺️  Loading category mappings...');
    const mappingData = fs.readFileSync(MAPPING_FILE, 'utf8');
    const lines = mappingData.split('\n').filter(line => line.trim());

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
        const [id, category] = lines[i].split(',').map(s => s.trim());
        if (id && category) {
            // Validate category is in taxonomy
            if (allowedCategories.length === 0 || allowedCategories.includes(category)) {
                categoryMap.set(id, category);
            } else {
                console.log(`⚠️  Invalid category "${category}" for tool "${id}", ignoring`);
            }
        }
    }
    console.log(`✅ Loaded ${categoryMap.size} category mappings`);
} else {
    console.log('⚠️  No mapping file found, all tools will be Uncategorized');
}

console.log('🔄 Reading Excel file...');
const workbook = XLSX.readFile(INPUT_FILE);
const firstSheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[firstSheetName];

console.log(`📊 Using sheet: "${firstSheetName}"`);

// Convert to JSON (first row is headers)
const rawData = XLSX.utils.sheet_to_json(worksheet);

console.log(`📝 Found ${rawData.length} rows`);

// Display detected headers
if (rawData.length > 0) {
    const headers = Object.keys(rawData[0]);
    console.log('🔍 Detected headers:', headers);
}

// Normalize and transform data
const toolsMap = new Map();
const seen = new Set();

rawData.forEach((row, index) => {
    // Map Excel columns: id, name, field (category), final_url (website)
    const excelId = row.id || null;
    const name = row.name || `Tool ${index + 1}`;
    const websiteUrl = row.final_url || null;

    // These columns don't exist in the Excel, set to null
    const affiliateUrl = null;
    const description = null;
    const pricing = null;
    const tags = [];

    // Create stable ID from Excel ID or name
    let baseId = excelId;
    if (!baseId) {
        baseId = name.toLowerCase()
            .replace(/[^a-z0-9\\s-]/g, '')
            .replace(/\\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }

    // De-duplicate check
    const dedupeKey = `${name.toLowerCase()}|${(websiteUrl || '').toLowerCase()}`;
    if (seen.has(dedupeKey)) {
        console.log(`⚠️  Skipping duplicate: ${name}`);
        return;
    }
    seen.add(dedupeKey);

    // Determine category: check mapping first, otherwise Uncategorized
    let category = 'Uncategorized';
    if (baseId && categoryMap.has(baseId)) {
        category = categoryMap.get(baseId);
    }

    // Build tool object
    const newTool = {
        id: baseId || `tool-${index + 1}`,
        name: name,
        website_url: websiteUrl,
        affiliate_url: affiliateUrl,
        category: category,
        description: description,
        pricing: pricing,
        tags: tags,
        source_row: index + 2 // +2 because Excel is 1-indexed and has header row
    };

    // Use Map to enforce unique IDs (Last-Write Wins for duplicates like "Cursor" vs "Cursor (Ref)")
    // This handles the 4 duplicate pairs in the Excel file by keeping the later/better version
    toolsMap.set(newTool.id, newTool);
});

// Phase A.2: Inject manually approved tools (last-write-wins to ensure these versions take precedence)
const manualTools = [
    { id: 'google-gemini', name: 'Google Gemini', website_url: 'https://gemini.google.com', category: 'Productivity' },
    { id: 'google-ai-studio', name: 'Google AI Studio', website_url: 'https://aistudio.google.com', category: 'Development' },
    { id: 'openai-playground', name: 'OpenAI Playground', website_url: 'https://platform.openai.com/playground', category: 'Development' },
    { id: 'microsoft-copilot', name: 'Microsoft Copilot', website_url: 'https://copilot.microsoft.com', category: 'Productivity' },
    { id: 'perplexity-pages', name: 'Perplexity Pages', website_url: 'https://www.perplexity.ai/pages', category: 'Research' },
    { id: 'meta-ai', name: 'Meta AI', website_url: 'https://ai.meta.com', category: 'Research' },
    { id: 'amazon-q', name: 'Amazon Q', website_url: 'https://aws.amazon.com/q', category: 'Business' },
    { id: 'apple-intelligence', name: 'Apple Intelligence', website_url: 'https://www.apple.com/apple-intelligence/', category: 'Productivity' },
    { id: 'replit-ai', name: 'Replit AI', website_url: 'https://replit.com/ai', category: 'Development' },
    { id: 'antigravity', name: 'Antigravity', website_url: 'https://antigravity.google/', category: 'Development' },
    { id: 'lovable', name: 'Lovable', website_url: 'https://lovable.dev', category: 'Development' },
    { id: 'bolt', name: 'Bolt.new', website_url: 'https://bolt.new', category: 'Development' },
    { id: 'vercel-ai-sdk', name: 'Vercel AI SDK', website_url: 'https://sdk.vercel.ai', category: 'Development' },
    { id: 'langchain', name: 'LangChain', website_url: 'https://www.langchain.com', category: 'Development' },
    { id: 'llamaindex', name: 'LlamaIndex', website_url: 'https://www.llamaindex.ai', category: 'Development' },
    { id: 'cloudflare-workers-ai', name: 'Cloudflare Workers AI', website_url: 'https://developers.cloudflare.com/workers-ai/', category: 'Development' },
    { id: 'elevenlabs', name: 'ElevenLabs', website_url: 'https://elevenlabs.io', category: 'Video & Audio' },
    { id: 'suno', name: 'Suno', website_url: 'https://suno.ai', category: 'Video & Audio' },
    { id: 'udio', name: 'Udio', website_url: 'https://www.udio.com', category: 'Video & Audio' },
    { id: 'luma-ai', name: 'Luma AI', website_url: 'https://lumalabs.ai', category: 'Video & Audio' },
    { id: 'pika-labs', name: 'Pika Labs', website_url: 'https://pika.art', category: 'Video & Audio' },
    { id: 'leonardo-ai', name: 'Leonardo AI', website_url: 'https://leonardo.ai', category: 'Design' },
    { id: 'ideogram', name: 'Ideogram', website_url: 'https://ideogram.ai', category: 'Design' },
    { id: 'otterai', name: 'Otter.ai', website_url: 'https://otter.ai', category: 'Productivity' },
    { id: 'firefliesai', name: 'Fireflies.ai', website_url: 'https://fireflies.ai', category: 'Productivity' },
    { id: 'hubspot-ai', name: 'HubSpot AI', website_url: 'https://www.hubspot.com/artificial-intelligence', category: 'Business' },
    { id: 'salesforce-einstein', name: 'Salesforce Einstein', website_url: 'https://www.salesforce.com/products/einstein/', category: 'Business' }
];

manualTools.forEach(tool => {
    // Check if tool already exists (by ID) to preserve description/tags
    const existing = toolsMap.get(tool.id);
    const merged = {
        ...tool,
        affiliate_url: existing ? existing.affiliate_url : null,
        description: existing ? existing.description : null,
        pricing: existing ? existing.pricing : null,
        tags: existing ? existing.tags : [],
        source_row: existing ? existing.source_row : 'manual-injection-a2'
    };
    toolsMap.set(tool.id, merged);
});

// Convert Map back to array
const tools = Array.from(toolsMap.values());

console.log(`✅ Processed ${tools.length} unique tools`);

// Count categorized vs uncategorized
const categorized = tools.filter(t => t.category !== 'Uncategorized').length;
const uncategorized = tools.filter(t => t.category === 'Uncategorized').length;
console.log(`📊 Categorized: ${categorized}, Uncategorized: ${uncategorized}`);

// Write output
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(tools, null, 2), 'utf8');
console.log(`💾 Written to: ${OUTPUT_FILE}`);
console.log('✨ Conversion complete!');
