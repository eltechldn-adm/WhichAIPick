/**
 * inject-footer.mjs
 *
 * Build-time script: stamps /partials/footer.html into the raw HTML source
 * of every public-facing page so that Google AdSense crawlers can detect
 * policy links, navigation, and trust signals without executing JavaScript.
 *
 * Usage: node scripts/inject-footer.mjs
 *
 * Safe to re-run: idempotent. If the footer is already injected it will be
 * replaced with the current partial content, preventing drift.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.join(__dirname, '..');

// ─── Load Footer Partial ────────────────────────────────────────────────────
const footerPath    = path.join(ROOT, 'partials', 'footer.html');
const footerContent = fs.readFileSync(footerPath, 'utf8').trim();

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
];

// Pure redirect pages: they have no body content worth footering.
// They are already noindex, body contains only a single <p>Redirecting…</p>.
const REDIRECT_ONLY = new Set([
  'browse.html',
  path.join('blog',       'index.html'),
  path.join('academy',    'index.html'),
  path.join('use-cases',  'index.html'),
  path.join('make-money', 'index.html'),
  path.join('compare',    'index.html'),
  // Note: start-here/index.html is a REAL content page — do NOT exclude it.
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
const SHELL_REGEX = /<div id="site-footer"><\/div>/g;

// Match an already-injected footer block (from a previous run) so we can
// replace it cleanly and stay idempotent.
const EXISTING_FOOTER_REGEX = /<div id="site-footer">\s*<footer[\s\S]*?<\/footer>\s*<\/div>/g;

function injectFooter(html) {
  // Replace empty shell
  if (SHELL_REGEX.test(html)) {
    return html.replace(
      /<div id="site-footer"><\/div>/g,
      `<div id="site-footer">\n${footerContent}\n</div>`
    );
  }
  // Replace already-injected block (idempotent re-run)
  if (EXISTING_FOOTER_REGEX.test(html)) {
    return html.replace(
      EXISTING_FOOTER_REGEX,
      `<div id="site-footer">\n${footerContent}\n</div>`
    );
  }
  return null; // no footer container found — skip
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
  EXISTING_FOOTER_REGEX.lastIndex = 0;

  const updated = injectFooter(original);

  if (updated === null) {
    console.log(`  [SKIP — no footer shell] ${rel}`);
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

console.log(`\nDone. ${injected} file(s) updated, ${skipped} redirect-only skipped, ${noShell} had no footer shell.`);
