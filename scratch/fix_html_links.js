const fs = require('fs');
const path = require('path');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // Replace canonical links
    content = content.replace(/<link rel="canonical" href="https:\/\/whichaipick\.com\/([^".]+)\.html">/g, '<link rel="canonical" href="https://whichaipick.com/$1/">');

    // Replace internal root links (e.g. href="/find.html")
    // Note: Some might be root index.html? We shouldn't match /index.html. Let's explicitly exclude index.html or handle it.
    // Actually, Cloudflare typically resolves /index.html to /
    content = content.replace(/href="\/([^".]+)\.html([#?][^"]*)?"/g, (match, p1, p2) => {
        if (p1 === 'index') return `href="/${p2 || ''}"`;
        return `href="/${p1}/${p2 || ''}"`; // canonical form is usually trailing slash for directories, but let's see. Wait, in Next.js it's without trailing slash, but this is a static site. 
    });

    // Replace absolute internal links
    content = content.replace(/href="https:\/\/whichaipick\.com\/([^".]+)\.html([#?][^"]*)?"/g, (match, p1, p2) => {
        if (p1 === 'index') return `href="https://whichaipick.com/${p2 || ''}"`;
        return `href="https://whichaipick.com/${p1}/${p2 || ''}"`;
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    }
}

// Gather files
const filesToProcess = [];
const rootDir = __dirname + '/../';
const rootFiles = fs.readdirSync(rootDir).filter(f => f.endsWith('.html'));
rootFiles.forEach(f => filesToProcess.push(path.join(rootDir, f)));

const partialsDir = path.join(rootDir, 'partials');
if (fs.existsSync(partialsDir)) {
    fs.readdirSync(partialsDir).filter(f => f.endsWith('.html')).forEach(f => filesToProcess.push(path.join(partialsDir, f)));
}

filesToProcess.forEach(processFile);
console.log('Done.');
