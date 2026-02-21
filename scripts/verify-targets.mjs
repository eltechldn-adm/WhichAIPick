import { readFileSync } from 'fs';
const tools = JSON.parse(readFileSync('./data/tools.json', 'utf8'));

const targets = [
    'bing-chat', 'hugging-face', 'bubble', 'flutterflow', 'n8n', 'make-integromat', 'glide', 'motion', 'clickup-ai', 'coda-ai',
    'beautifulai', 'clipchamp', 'clipdrop', 'd-id', 'fliki', 'kapwing', 'krisp', 'lumen5', 'craiyon', 'ideogram',
    'ai21-labs', 'anthropic-claude-api', 'cohere-api', 'google-ai-studio', 'amazon-codewhisperer', 'fig', 'codex-openai', 'assemblyai', 'deepai', 'dreamstudio',
    'consensus', 'elicit', 'fathom', 'frase', 'marketmuse', 'copysmith', 'hyperwrite', 'anyword', '10web', 'durable',
    'manychat', 'gong', 'donotpay', 'freshdesk-ai', 'khan-academy-khanmigo', 'mem', 'activepieces', 'adalo', 'adcreativeai', 'akkio'
];

let missing = [];
let enriched = [];

targets.forEach(id => {
    const tool = tools.find(t => t.id === id);
    if (!tool) {
        missing.push(id);
    } else if ('long_description' in tool) {
        enriched.push(id);
    }
});

console.log('Targets length:', targets.length);
if (missing.length > 0) console.log('Missing tools:', missing);
else console.log('All tools found!');

if (enriched.length > 0) console.log('Already enriched tools:', enriched);
else console.log('None of these are enriched yet!');
