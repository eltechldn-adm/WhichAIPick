import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, '../data/URLs_for_Which_AI_Tool_AUDITED_2026-09-11.xlsx');
const TOOLS_JSON_FILE = path.join(__dirname, '../data/tools.json');

console.log('🔄 Loading existing tools.json...');
const existingTools = JSON.parse(fs.readFileSync(TOOLS_JSON_FILE, 'utf8'));
const existingToolsMap = new Map();
const existingToolsByName = new Map();

existingTools.forEach(tool => {
    existingToolsMap.set(tool.id, tool);
    existingToolsByName.set(tool.name.toLowerCase(), tool);
});

console.log('🔄 Reading Excel file...');
const workbook = XLSX.readFile(INPUT_FILE);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const rawData = XLSX.utils.sheet_to_json(worksheet);

let updatedCount = 0;
let newCount = 0;

const mergedToolsMap = new Map();

rawData.forEach((row, index) => {
    const excelId = row.id || null;
    const name = row.name || `Tool ${index + 1}`;
    
    let baseId = excelId;
    if (!baseId) {
        baseId = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
    }

    let existingTool = existingToolsMap.get(baseId);
    if (!existingTool) {
        existingTool = existingToolsByName.get(name.toLowerCase());
        if (existingTool) {
            console.log(`⚠️ ID mismatch but name matched for ${name}. Old ID: ${existingTool.id}, New ID: ${baseId}`);
        }
    }

    if (existingTool) {
        updatedCount++;
        mergedToolsMap.set(baseId, existingTool);
    } else {
        newCount++;
        mergedToolsMap.set(baseId, { id: baseId, name: name });
    }
});

let missingCount = 0;
existingTools.forEach(tool => {
    let found = false;
    for (const [id, mTool] of mergedToolsMap.entries()) {
        if (mTool.name.toLowerCase() === tool.name.toLowerCase() || mTool.id === tool.id) {
            found = true;
            break;
        }
    }
    if (!found) {
        missingCount++;
    }
});

console.log(`\n✅ Summary:`);
console.log(`Updated existing tools: ${updatedCount}`);
console.log(`New tools added: ${newCount}`);
console.log(`Tools in JSON but missing in spreadsheet: ${missingCount}`);
