import { readFileSync } from 'fs';
const tools = JSON.parse(readFileSync('./data/tools.json', 'utf8'));

// Only tools that DO NOT have long_description are considered "unenriched"
const unenriched = tools.filter(t => !('long_description' in t));

console.log('Total unenriched:', unenriched.length);

// Sort by some heuristic (name is fine)
const names = unenriched.map(t => `${t.id} (${t.name}) - ${t.category}`);
console.log(names.slice(0, 150).join('\n'));
