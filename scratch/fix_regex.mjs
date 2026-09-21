import fs from 'fs';
import path from 'path';

const files = [
    'generate-best-tools.mjs',
    'generate-alternatives.mjs',
    'generate-comparisons.mjs',
    'generate-guides.mjs'
];

files.forEach(f => {
    let p = path.join('/Users/elainamarriott/Documents/SAAS Projects/Which_AI_Pick/scripts/seo', f);
    let content = fs.readFileSync(p, 'utf-8');
    
    // Fix the description regex to be non-greedy and handle newlines, but only replace the first occurrence (standard description)
    content = content.replace(/.replace\(\/<meta name="description" content="\[\^"\]\*">\/, \`<meta name="description" content="\$\{def.metaDescription\}">\`\)/g, 
        `.replace(/<meta name="description"[\\s\\S]*?>/, \`<meta name="description" content="\${def.metaDescription}">\`)
        .replace(/<meta property="og:description"[\\s\\S]*?>/, \`<meta property="og:description" content="\${def.metaDescription}">\`)
        .replace(/<meta property="twitter:description"[\\s\\S]*?>/, \`<meta property="twitter:description" content="\${def.metaDescription}">\`)
        .replace(/<meta name="robots" content="noindex,follow">/, \`<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">\`)`
    );

    // Also fix the root generation in index.html block at the bottom
    content = content.replace(/.replace\(\/<meta name="description" content="\[\^"\]\*">\/, \`<meta name="description" content="(.*?)">\`\)/g, 
        `.replace(/<meta name="description"[\\s\\S]*?>/, \`<meta name="description" content="$1">\`)
    .replace(/<meta property="og:description"[\\s\\S]*?>/, \`<meta property="og:description" content="$1">\`)
    .replace(/<meta property="twitter:description"[\\s\\S]*?>/, \`<meta property="twitter:description" content="$1">\`)
    .replace(/<meta name="robots" content="noindex,follow">/, \`<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">\`)`
    );

    fs.writeFileSync(p, content);
});

console.log("Updated template replacement logic.");
