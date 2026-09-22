const fs = require('fs');

let content = fs.readFileSync('scripts/validate-data.mjs', 'utf8');

// We need to add checking for duplicate names, domains, alias collisions.
// And circular successors.

const newGlobals = `
const seenNames = new Map();
const seenDomains = new Map();
const seenAliases = new Map();

function getDomain(url) {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch(e) { return null; }
}
`;

content = content.replace('const seenDescriptions = new Set();', 'const seenDescriptions = new Set();' + newGlobals);

const loopChecks = `
    if (seenNames.has(tool.name.toLowerCase())) {
        console.error(\`[ERROR] Tool \${tool.id} has duplicate name: \${tool.name} (matches \${seenNames.get(tool.name.toLowerCase())})\`);
        errors++;
    }
    seenNames.set(tool.name.toLowerCase(), tool.id);

    if (tool.website_url) {
        const domain = getDomain(tool.website_url);
        if (domain && seenDomains.has(domain)) {
            console.warn(\`[WARNING] Tool \${tool.id} has duplicate domain: \${domain} (matches \${seenDomains.get(domain)})\`);
            warnings++;
        }
        if (domain) seenDomains.set(domain, tool.id);
    }
    
    if (Array.isArray(tool.aliases)) {
        tool.aliases.forEach(alias => {
            const a = alias.toLowerCase();
            if (seenAliases.has(a)) {
                console.error(\`[ERROR] Tool \${tool.id} has alias collision: \${alias} (matches \${seenAliases.get(a)})\`);
                errors++;
            }
            seenAliases.set(a, tool.id);
        });
    }
`;

content = content.replace('// 3. OFFICIAL & AFFILIATE URL VALIDATION', loopChecks + '\n    // 3. OFFICIAL & AFFILIATE URL VALIDATION');

const postLoopChecks = `
// Circular successor detection
const successorGraph = new Map(toolsJson.filter(t => t.successorToolId).map(t => [t.id, t.successorToolId]));
for (const startId of successorGraph.keys()) {
    let currentId = startId;
    const visited = new Set();
    while (currentId) {
        if (visited.has(currentId)) {
            console.error(\`[ERROR] Circular successor chain detected involving \${startId}\`);
            errors++;
            break;
        }
        visited.add(currentId);
        currentId = successorGraph.get(currentId);
    }
}
`;

content = content.replace('// successorToolId referential integrity', postLoopChecks + '\n// successorToolId referential integrity');

fs.writeFileSync('scripts/validate-data.mjs', content);
