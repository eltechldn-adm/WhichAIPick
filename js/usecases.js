/**
 * usecases.js
 * Handles loading and parsing of tool use cases from CSV.
 */

const USE_CASES_URL = 'data/tool-use-cases.csv';
let useCasesMap = null; // Cache

// Parse CSV line handling quotes (basic implementation as we control the data)
// For our simple format (id, pipe-separated-string), a simple split is likely enough
// unless we strictly need to handle commas inside the description.
// Given the Phase U1 scope, we will assume standard CSV format:
// id,use_cases_string
function parseCSV(text) {
    const lines = text.split('\n');
    const map = new Map();

    // Skip header (id,use_cases)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple comma split. If we need more robust parsing later, we can upgrade.
        // Our seeded data doesn't have commas in the use_cases string, it uses pipes.
        const firstCommaIndex = line.indexOf(',');
        if (firstCommaIndex === -1) continue;

        const id = line.substring(0, firstCommaIndex).trim();
        const content = line.substring(firstCommaIndex + 1).trim();

        // Remove wrapping quotes if present
        const cleanContent = content.replace(/^"|"$/g, '');

        // Split by pipe
        const useCases = cleanContent.split('|').map(u => u.trim()).filter(u => u.length > 0);

        if (id && useCases.length > 0) {
            map.set(id, useCases);
        }
    }
    return map;
}

async function loadUseCases() {
    if (useCasesMap) return useCasesMap;

    try {
        const response = await fetch(`${USE_CASES_URL}?v=1.6`); // Cache bust match main.js
        if (!response.ok) throw new Error('Failed to load use cases');

        const text = await response.text();
        useCasesMap = parseCSV(text);
        return useCasesMap;
    } catch (error) {
        console.error('Error loading use cases:', error);
        return new Map(); // Return empty map on error to prevent UI breakage
    }
}

function getUseCasesForTool(toolId) {
    if (!useCasesMap) return null;
    return useCasesMap.get(toolId) || null;
}

// Expose globally
window.loadUseCases = loadUseCases;
window.getUseCasesForTool = getUseCasesForTool;
