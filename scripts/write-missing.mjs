import fs from 'fs';
const tools = JSON.parse(fs.readFileSync('./data/tools.json', 'utf8'));

let missing = tools.slice(0, 300).filter(x => !x.long_description).map(x => x.id);
fs.writeFileSync('./missing.txt', missing.join('\n'));
