import fs from 'fs';
const tools = JSON.parse(fs.readFileSync('./data/tools.json', 'utf8'));
const unenriched = tools.filter(x => !x.long_description);
console.log('Unenriched Count:', unenriched.length);
console.log('IDs:', unenriched.map(x => x.id).join(', '));
