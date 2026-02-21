import fs from 'fs';

const PATH = './data/tools.json';
const tools = JSON.parse(fs.readFileSync(PATH, 'utf8'));

// Dictionaries mapping hype words to neutral alternatives
// Utilizing word boundaries to avoid replacing parts of words
const replacements = [
    // Destruction / War metaphors
    { regex: /\b(destroy(s|ing)?|annihilate(s|ing)?|obliterate(s|ing)?|eradicate(s|ing)?|shatter(s|ing)?)\b/gi, replacement: "eliminate$2" },
    { regex: /\b(weaponize(d|s)?)\b/gi, replacement: "utilize$2" },
    { regex: /\btrench warfare\b/gi, replacement: "direct competition" },
    { regex: /\b(warring against)\b/gi, replacement: "competing with" },
    { regex: /\b(battle(s)?)\b/gi, replacement: "compete$2" },
    { regex: /\b(aggressive(ly)?)\b/gi, replacement: "proactive$2" },

    // Size / Scale exaggeration
    { regex: /\b(massive(ly)?)\b/gi, replacement: "large-scale" }, // Need to be careful with massively -> large-scale-ly, so handled below
    { regex: /\bmassively\b/gi, replacement: "extensively" },
    { regex: /\bmassive\b/gi, replacement: "large" },
    { regex: /\b(colossal|staggering|gigantic|monumental|infinite)\b/gi, replacement: "significant" },
    { regex: /\b(staggeringly|phenomenally|unimaginably|incredibly)\b/gi, replacement: "highly" },

    // Emotion / Terror / Magic
    { regex: /\b(terrifying(ly)?)\b/gi, replacement: "complex" },
    { regex: /\b(horrifying(ly)?)\b/gi, replacement: "difficult" },
    { regex: /\b(apocalyptic)\b/gi, replacement: "severe" },
    { regex: /\b(magic)\b/gi, replacement: "capability" },
    { regex: /\b(mind-blowing|insane|crazy|wildly)\b/gi, replacement: "notable" },
    { regex: /\b(desperate)\b/gi, replacement: "focused" },
    { regex: /\b(anguish|anxiety|panic attacks)\b/gi, replacement: "friction" },
    { regex: /\b(boring)\b/gi, replacement: "routine" },

    // Superiority / Supremacy
    { regex: /\b(god(s)?|titan(s)?|apex-predator|juggernaut)\b/gi, replacement: "leader$2" },
    { regex: /\b(absolute|undisputed|unmatched)\b/gi, replacement: "established" },
    { regex: /\b(supreme)\b/gi, replacement: "primary" },
    { regex: /\b(flawless(ly)?)\b/gi, replacement: "accurate$2" },
    { regex: /\perfect(ly)?\b/gi, replacement: "accurate$2" },

    // Revolution / Disruption
    { regex: /\b(revolutionary|disruptive|game-changing)\b/gi, replacement: "innovative" },

    // Phrases
    { regex: /\b(holy grail)\b/gi, replacement: "key objective" },
    { regex: /\b(hallucinate(s|d)?)\b/gi, replacement: "generate$2" }, // in the context of generating content on purpose
    { regex: /\b(hallucination)\b/gi, replacement: "generation" }
];

const targetFields = [
    'long_description',
    'how_it_works',
    'workflows',
    'feature_groups',
    'pros',
    'cons',
    'pricing_overview',
    'comparison_summary'
];

let processedCount = 0;

function cleanString(str) {
    if (typeof str !== 'string') return str;
    let cleaned = str;
    for (const { regex, replacement } of replacements) {
        cleaned = cleaned.replace(regex, replacement);
    }
    // Capitalize first letter of replacement if original was capitalized
    // Simple regex replace doesn't handle case matching perfectly, so we do a quick pass
    // Actually, standard string replace with literal string ignores case of matched source.
    // For basic normalization, this is usually acceptable, but let's just use the replacements.
    // A secondary pass to clean up double spaces or awkward phrasing might be needed, but regex is safest.

    // Fix some grammatical awkwardness that might arise 
    cleaned = cleaned.replace(/a accurate/gi, "an accurate");
    cleaned = cleaned.replace(/an large/gi, "a large");

    return cleaned;
}

const beforeExample = {};
const afterExample = {};
let capturedExample = false;

for (const tool of tools) {
    // Only process tools that have enrichment fields
    if (tool.long_description) {

        if (tool.id === 'replit-ai' && !capturedExample) {
            beforeExample.id = tool.id;
            for (const field of targetFields) {
                if (tool[field]) {
                    beforeExample[field] = JSON.parse(JSON.stringify(tool[field]));
                }
            }
        }

        for (const field of targetFields) {
            if (Array.isArray(tool[field])) {
                // Handle workflows, feature_groups, pros, cons
                for (let i = 0; i < tool[field].length; i++) {
                    const item = tool[field][i];
                    if (typeof item === 'string') {
                        tool[field][i] = cleanString(item);
                    } else if (typeof item === 'object') {
                        // e.g. workflows { title, description }
                        for (const key in item) {
                            if (typeof item[key] === 'string') {
                                item[key] = cleanString(item[key]);
                            } else if (Array.isArray(item[key])) {
                                for (let j = 0; j < item[key].length; j++) {
                                    if (typeof item[key][j] === 'string') {
                                        item[key][j] = cleanString(item[key][j]);
                                    }
                                }
                            }
                        }
                    }
                }
            } else if (typeof tool[field] === 'string') {
                tool[field] = cleanString(tool[field]);
            }
        }

        if (tool.id === 'replit-ai' && !capturedExample) {
            afterExample.id = tool.id;
            for (const field of targetFields) {
                if (tool[field]) {
                    afterExample[field] = JSON.parse(JSON.stringify(tool[field]));
                }
            }
            capturedExample = true;
        }

        processedCount++;
    }
}

fs.writeFileSync(PATH, JSON.stringify(tools, null, 2));

console.log(`Tone hardening complete. Processed ${processedCount} tools.`);

// Output diff for one tool
console.log('\n--- EXAMPLE DIFF (replit-ai) ---');
console.log('\nBEFORE: long_description');
console.log(beforeExample.long_description);
console.log('\nAFTER: long_description');
console.log(afterExample.long_description);

console.log('\nBEFORE: how_it_works');
console.log(beforeExample.how_it_works);
console.log('\nAFTER: how_it_works');
console.log(afterExample.how_it_works);
