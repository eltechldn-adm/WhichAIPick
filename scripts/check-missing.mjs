import fs from 'fs';
const tools = JSON.parse(fs.readFileSync('./data/tools.json', 'utf8'));
const enrichedTools = tools.slice(250, 300);

let missing = [];
for (const t of enrichedTools) {
    if (!t.long_description) {
        missing.push(t.id);
    }
}
console.log('Missing tools:', missing);
