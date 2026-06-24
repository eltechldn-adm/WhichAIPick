/**
 * inject-header.mjs
 *
 * Build-time script: stamps /partials/header.html into the raw HTML source
 * of every public-facing page so that Google AdSense crawlers can detect
 * navigation and search links without executing JavaScript, and to eliminate
 * Cumulative Layout Shift (CLS) for users.
 *
 * Usage: node scripts/inject-header.mjs
 *
 * Safe to re-run: idempotent. If the header is already injected it will be
 * replaced with the current partial content, preventing drift.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.join(__dirname, '..');

// ─── Load Header Partial ────────────────────────────────────────────────────
const headerPath    = path.join(ROOT, 'partials', 'header.html');
const headerContent = fs.readFileSync(headerPath, 'utf8').trim();

// ─── Pages to SKIP (non-public / noindex / admin / pure redirects) ──────────
const SKIP_PATTERNS = [
  'node_modules',
  '.git',
  '.wrangler',
  '.agent',
  '/admin/',
  '/partials/',
  '/scripts/',
  '/docs/',
  '/docs-private/',
];

// Pure redirect pages: they have no body content worth headering.
const REDIRECT_ONLY = new Set([
  'browse.html',
  path.join('blog',       'index.html'),
  path.join('academy',    'index.html'),
  path.join('use-cases',  'index.html'),
  path.join('make-money', 'index.html'),
  path.join('compare',    'index.html'),
]);

// ─── Collect Target Files ───────────────────────────────────────────────────
function collectHtmlFiles(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_PATTERNS.some(p => fullPath.includes(p))) continue;
      collectHtmlFiles(fullPath, results);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      if (SKIP_PATTERNS.some(p => fullPath.includes(p))) continue;
      results.push(fullPath);
    }
  }
  return results;
}

// ─── Injection Logic ─────────────────────────────────────────────────────────
const SHELL_REGEX = /<div id="site-header"><\/div>/g;

// Match an already-injected header block (from a previous run) so we can
// replace it cleanly and stay idempotent.
const EXISTING_HEADER_REGEX = /<div id="site-header">\s*<header[\s\S]*?<\/header>\s*<\/div>/g;

function injectHeader(html) {
  // Replace empty shell
  if (SHELL_REGEX.test(html)) {
    return html.replace(
      /<div id="site-header"><\/div>/g,
      `<div id="site-header">\n${headerContent}\n</div>`
    );
  }
  // Replace already-injected block (idempotent re-run)
  if (EXISTING_HEADER_REGEX.test(html)) {
    return html.replace(
      EXISTING_HEADER_REGEX,
      `<div id="site-header">\n${headerContent}\n</div>`
    );
  }
  return null; // no header container found — skip
}

// ─── Run ─────────────────────────────────────────────────────────────────────
const allFiles = collectHtmlFiles(ROOT);

let injected   = 0;
let skipped    = 0;
let noShell    = 0;

for (const filePath of allFiles) {
  const rel = path.relative(ROOT, filePath);

  // Skip pure redirect pages
  if (REDIRECT_ONLY.has(rel)) {
    skipped++;
    continue;
  }

  const original = fs.readFileSync(filePath, 'utf8');
  // Reset regex state (global flag requires reset between calls)
  SHELL_REGEX.lastIndex    = 0;
  EXISTING_HEADER_REGEX.lastIndex = 0;

  const updated = injectHeader(original);

  if (updated === null) {
    console.log(`  [SKIP — no header shell] ${rel}`);
    noShell++;
    continue;
  }

  if (updated === original) {
    console.log(`  [UNCHANGED]              ${rel}`);
    continue;
  }

  fs.writeFileSync(filePath, updated, 'utf8');
  console.log(`  [INJECTED]               ${rel}`);
  injected++;
}

console.log(`\nDone. ${injected} file(s) updated, ${skipped} redirect-only skipped, ${noShell} had no header shell.`);
