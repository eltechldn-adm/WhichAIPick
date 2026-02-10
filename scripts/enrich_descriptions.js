import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const toolsPath = path.join(__dirname, '../data/tools.json');
const useCasesPath = path.join(__dirname, '../data/tool-use-cases.csv');
const descriptionsPath = path.join(__dirname, '../data/tool-descriptions.csv');

// Read Data
const tools = JSON.parse(fs.readFileSync(toolsPath, 'utf8'));
const useCasesRaw = fs.readFileSync(useCasesPath, 'utf8').split('\n');
const descriptionsRaw = fs.readFileSync(descriptionsPath, 'utf8').split('\n');

// Parse Use Cases into Map
const useCasesMap = new Map();
useCasesRaw.forEach(line => {
    if (!line.trim()) return;
    const firstComma = line.indexOf(',');
    if (firstComma === -1) return;
    const uId = line.substring(0, firstComma).trim();
    const uContent = line.substring(firstComma + 1).trim();
    useCasesMap.set(uId, uContent);
});

// Parse Existing Descriptions
const existingIds = new Set();
descriptionsRaw.forEach(line => {
    if (!line.trim()) return;
    const firstComma = line.indexOf(',');
    if (firstComma === -1) return;
    const id = line.substring(0, firstComma).trim();
    existingIds.add(id);
});

// Generate New Descriptions
let newDescriptionsCount = 0;
let newContent = '';

tools.forEach(tool => {
    if (existingIds.has(tool.id)) return;
    if (tool.id === 'id') return; // Skip header match if any

    const useCaseString = useCasesMap.get(tool.id);
    let summary = '';

    if (useCaseString) {
        // Convert "doing x|doing y|doing z" to "Topic for doing x, doing y, and doing z."
        const cases = useCaseString.split('|').slice(0, 3); // Take top 3
        if (cases.length > 0) {
            const category = tool.category || 'Artificial Intelligence';
            // Clean cases
            const cleanCases = cases.map(c => c.trim().toLowerCase());
            if (cleanCases.length === 1) {
                summary = `${tool.name} is a ${category} tool designed for ${cleanCases[0]}.`;
            } else if (cleanCases.length === 2) {
                summary = `${tool.name} is a ${category} tool designed for ${cleanCases[0]} and ${cleanCases[1]}.`;
            } else {
                summary = `${tool.name} is a ${category} tool designed for ${cleanCases[0]}, ${cleanCases[1]}, and ${cleanCases[2]}.`;
            }
        }
    }

    if (!summary) {
        // Fallback if no use cases
        const category = tool.category || 'AI';
        summary = `${tool.name} is an innovative ${category} solution powered by artificial intelligence.`;
    }

    // Escape quotes in summary
    const safeSummary = `"${summary.replace(/"/g, '""')}"`;
    newContent += `${tool.id},${safeSummary}\n`;
    newDescriptionsCount++;
});

if (newDescriptionsCount > 0) {
    fs.appendFileSync(descriptionsPath, newContent);
    console.log(`Added ${newDescriptionsCount} new descriptions.`);
} else {
    console.log('No new descriptions needed.');
}
