/**
 * generate-static-pages.mjs
 *
 * Phase 3 build script: generates crawler-visible static HTML pages for:
 *   /tools/[tool-slug]/index.html  — one per tool (322 pages)
 *   /category/[category-slug]/index.html — one per category (10 pages)
 *
 * Run: node scripts/generate-static-pages.mjs
 * Safe to re-run: existing pages are overwritten with fresh data.
 *
 * Does NOT modify tool.html or category.html (legacy pages preserved).
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.join(__dirname, '..');
const DOMAIN     = 'https://whichaipick.com';

// ─── Load Data ────────────────────────────────────────────────────────────────
const tools    = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'tools.json'), 'utf8'));
const footer   = fs.readFileSync(path.join(ROOT, 'partials', 'footer.html'), 'utf8').trim();

// ─── Helpers ─────────────────────────────────────────────────────────────────
/** Convert a category name to a URL slug: "Video & Audio" → "video-audio" */
function categorySlug(cat) {
  return cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Strip HTML tags for use in meta content */
function stripHtml(html = '') {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Truncate a string for meta descriptions (max 160 chars) */
function truncate(str, max = 160) {
  if (!str || str.length <= max) return str || '';
  return str.slice(0, max - 1).trimEnd() + '…';
}

/** Escape HTML special characters for safe attribute values */
function escAttr(str = '') {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Build a bullet list <ul> from an array of strings */
function buildList(items = [], className = '') {
  if (!items || items.length === 0) return '';
  const liItems = items.map(i => `<li>${escAttr(i)}</li>`).join('\n            ');
  return `<ul class="${className}">\n            ${liItems}\n          </ul>`;
}

/** Category display metadata */
const CATEGORY_META = {
  'Productivity': {
    intro: 'AI tools that help you work faster, stay organised, and eliminate repetitive tasks from your daily workflow.',
    description: 'From smart note-taking to automated scheduling, these tools are built to reclaim your time and mental bandwidth. Whether you are managing projects solo or coordinating a team, AI-powered productivity tools integrate into the tools you already use to handle the heavy lifting.',
    faq: [
      { q: 'What do AI productivity tools actually do?', a: 'They automate repetitive tasks such as meeting summaries, email drafts, task prioritisation, and schedule management — freeing you to focus on high-value work.' },
      { q: 'Do I need technical skills to use these tools?', a: 'No. Most AI productivity tools are designed for everyday users and require no coding knowledge. They integrate with existing apps like Google Workspace, Slack, and Notion.' },
      { q: 'Are AI productivity tools worth paying for?', a: 'If a tool saves you even one hour per week, it typically pays for itself within the first month. Many tools offer free tiers to test before committing.' }
    ]
  },
  'Content Creation': {
    intro: 'AI tools for writing, editing, publishing, and repurposing content across every format and platform.',
    description: 'Whether you are a solo creator, a marketing team, or a media company, content creation AI tools dramatically reduce the time from idea to published output. From long-form article writers to social media caption generators and SEO optimisers, these tools handle the production layer so you can focus on strategy and creativity.',
    faq: [
      { q: 'Will AI-generated content hurt my SEO?', a: 'Not if used correctly. Google evaluates content quality, helpfulness, and originality — not how it was created. AI tools are most effective when used to assist human editors, not replace them entirely.' },
      { q: 'Can AI tools write in my brand voice?', a: 'Many tools allow you to train a custom voice profile or provide style guidelines. The best results come from combining AI drafts with human editing and brand knowledge.' },
      { q: 'What is the difference between a writing assistant and a full content generator?', a: 'Writing assistants help edit and improve your existing text. Full generators create content from scratch using a prompt. Most platforms offer both modes.' }
    ]
  },
  'Development': {
    intro: 'AI tools that assist developers with writing code, debugging, testing, documentation, and deployment.',
    description: 'Modern AI development tools go far beyond simple autocomplete. They understand entire codebases, generate working components from natural language descriptions, identify security vulnerabilities, write unit tests automatically, and explain legacy code. From solo developers to enterprise engineering teams, these tools meaningfully accelerate every stage of the software development lifecycle.',
    faq: [
      { q: 'Do AI coding tools work with my existing IDE?', a: 'Most integrate directly with VS Code, JetBrains, Neovim, and other popular editors via extensions. Some also offer browser-based environments.' },
      { q: 'Are AI coding assistants safe to use for proprietary code?', a: 'Check each tool\'s data usage policy. Enterprise plans from major providers typically offer zero data retention and private deployment options.' },
      { q: 'Can AI tools write production-ready code?', a: 'AI tools generate high-quality starting points, but all generated code should be reviewed by a developer before deployment. They are most valuable for boilerplate, tests, and repetitive patterns.' }
    ]
  },
  'Design': {
    intro: 'AI tools for graphic design, image generation, UI/UX, branding, and visual content creation.',
    description: 'AI has fundamentally changed what is possible for designers at every skill level. From professional designers using AI to accelerate production, to non-designers creating polished visuals without training — these tools cover image generation, logo design, presentation building, UI prototyping, and brand asset creation.',
    faq: [
      { q: 'Do I need design skills to use AI design tools?', a: 'No. Many tools are built specifically for non-designers and use natural language prompts or template-based interfaces to produce professional results.' },
      { q: 'Who owns the images AI generates?', a: 'Ownership varies by platform. Most commercial AI image generators grant you full usage rights to images created on paid plans. Always check the specific tool\'s terms of service.' },
      { q: 'Can AI tools replace a professional designer?', a: 'For routine production tasks and asset generation, yes. For complex brand strategy, custom illustration, and nuanced creative direction, human designers remain essential.' }
    ]
  },
  'Marketing': {
    intro: 'AI tools for campaign management, copywriting, ad creation, audience targeting, and marketing analytics.',
    description: 'Marketing AI tools help teams do more with less — generating ad copy at scale, personalising email campaigns, analysing competitor strategies, and optimising landing pages. From solo marketers to large agency teams, these tools compress weeks of work into hours.',
    faq: [
      { q: 'Can AI tools replace a marketing strategist?', a: 'AI tools excel at execution and data analysis. Strategic planning, creative direction, and brand positioning still require human judgment and market intuition.' },
      { q: 'How do AI tools improve email marketing?', a: 'They can generate personalised subject lines, optimise send timing, write segmented email body copy, and A/B test variations at a scale impossible to do manually.' },
      { q: 'Are there AI tools specifically for social media?', a: 'Yes. Many tools specialise in scheduling, caption generation, hashtag research, and cross-platform repurposing from a single piece of source content.' }
    ]
  },
  'Research': {
    intro: 'AI tools for academic research, competitive intelligence, data analysis, and knowledge synthesis.',
    description: 'Research AI tools dramatically reduce the time required to gather, process, and synthesise information from multiple sources. Whether conducting academic literature reviews, tracking competitor strategies, or analysing industry reports, these tools surface relevant insights faster than traditional manual research.',
    faq: [
      { q: 'Can AI tools replace primary research?', a: 'No. AI research tools are powerful for secondary research synthesis but cannot replace interviews, surveys, experiments, or original data collection.' },
      { q: 'How accurate is AI-generated research?', a: 'Accuracy depends on the tool and source data. Always verify AI-summarised claims against primary sources, particularly for academic or business-critical work.' },
      { q: 'What types of research tasks are AI tools best at?', a: 'Summarising long documents, extracting key points from PDFs, generating research outlines, identifying contradictions across sources, and tracking information across the web.' }
    ]
  },
  'Business': {
    intro: 'AI tools for business operations, HR, finance, customer service, and enterprise workflow automation.',
    description: 'Business AI tools address the operational backbone of modern organisations — from automating customer support queues, to generating financial models, drafting contracts, managing HR processes, and optimising supply chains. These tools are used by startups, SMBs, and enterprise teams to reduce operational overhead and make faster, data-informed decisions.',
    faq: [
      { q: 'What business processes benefit most from AI?', a: 'Customer service, document processing, data entry, report generation, scheduling, and employee onboarding consistently deliver the highest ROI when AI-automated.' },
      { q: 'Are business AI tools secure?', a: 'Enterprise-grade tools offer SOC 2 compliance, role-based access controls, and private data environments. Always evaluate security certifications before processing sensitive business data.' },
      { q: 'Can small businesses benefit from AI tools too?', a: 'Absolutely. Many tools are priced for solo operators and SMBs, offering significant productivity gains without enterprise-level budgets.' }
    ]
  },
  'Education': {
    intro: 'AI tools for learning, tutoring, course creation, academic support, and educational content generation.',
    description: 'Education AI tools serve learners of all ages — from students using AI tutors to grasp complex subjects, to educators building interactive courses, to professionals upskilling in new domains. These tools personalise the learning experience, provide instant feedback, and make quality education more accessible.',
    faq: [
      { q: 'Is using AI tools for studying considered cheating?', a: 'This depends entirely on the institution and context. AI tools used to explain concepts and aid comprehension are generally considered acceptable. Submitting AI-generated work as your own without disclosure may violate academic integrity policies.' },
      { q: 'Can AI tools tutor in any subject?', a: 'Most AI tutors cover a wide range of subjects. Specialised tools exist for mathematics, programming, language learning, test preparation, and sciences.' },
      { q: 'Are AI educational tools suitable for children?', a: 'Some are designed specifically for younger learners with age-appropriate interfaces and content filters. Always review the specific tool\'s privacy policy for data handling of minors.' }
    ]
  },
  'Video & Audio': {
    intro: 'AI tools for video editing, audio production, voice cloning, transcription, and multimedia content creation.',
    description: 'The video and audio AI space has seen explosive development. Tools in this category cover the full production pipeline: from AI script generation, to automated video editing, voice synthesis, sound design, music generation, transcription, and subtitle creation. Content creators, podcasters, filmmakers, and businesses all use these tools to produce professional-quality multimedia at dramatically lower cost and time.',
    faq: [
      { q: 'How good is AI-generated voice quality?', a: 'Modern AI voice synthesis is indistinguishable from human speech in many applications. Top tools like ElevenLabs produce studio-quality output from text input alone.' },
      { q: 'Can AI tools edit long-form videos automatically?', a: 'Yes. Several tools can ingest a raw video recording and automatically cut dead air, add captions, generate highlights clips, and format for multiple platforms without manual editing.' },
      { q: 'Are AI audio tools royalty-free for commercial use?', a: 'Most AI music and audio generation platforms grant commercial licences on paid tiers, but always verify the specific tool\'s licensing terms before using outputs in commercial projects.' }
    ]
  },
  'Automation': {
    intro: 'AI tools for workflow automation, process orchestration, integration, and no-code task execution.',
    description: 'Automation AI tools connect your applications, trigger actions based on rules or AI decisions, and execute complex multi-step processes without human intervention. From connecting 1,000+ apps via Zapier-style integrations, to building AI agents that autonomously complete research tasks, these tools are the infrastructure layer of the modern AI-powered business.',
    faq: [
      { q: 'What is the difference between automation tools and AI agents?', a: 'Traditional automation tools follow pre-defined rules and triggers. AI agents make decisions dynamically, adapting to context and choosing from multiple possible actions to achieve a goal.' },
      { q: 'Do I need coding skills to build automations?', a: 'Many automation tools are no-code and designed for non-technical users. More complex agentic systems may require some familiarity with APIs and logic flows.' },
      { q: 'How reliable are automated workflows?', a: 'Reliability depends on the stability of the connected APIs and the quality of the workflow logic. Well-designed automations with proper error handling can run for months without interruption.' }
    ]
  }
};

// ─── Footer Snippet ───────────────────────────────────────────────────────────
const FOOTER_HTML = `<div id="site-footer">
${footer}
</div>`;

// ─── Header Shell ─────────────────────────────────────────────────────────────
// Visual header loads via JS (layout.js) — same as all other pages on the site.
// This is acceptable: the critical crawler content is in the body and footer.
const HEADER_SHELL = `<div id="site-header"></div>`;

// ─── TOOL PAGE GENERATOR ─────────────────────────────────────────────────────
function buildToolPage(tool) {
  const slug         = tool.id;
  const name         = tool.name || slug;
  const category     = tool.category || 'AI Tools';
  const catSlug      = categorySlug(category);
  const canonicalUrl = `${DOMAIN}/tools/${slug}/`;

  const rawDesc = stripHtml(tool.long_description || '');
  const metaDesc = truncate(rawDesc || `${name} is an AI tool in the ${category} category. Discover features, pricing, pros, and alternatives on WhichAIPick.`, 160);
  const metaTitle = `${name} — AI ${category} Tool | WhichAIPick`;

  // Pricing badge
  let pricingBadge = '';
  if (tool.has_free_tier) pricingBadge = 'Free Tier Available';
  else if (tool.pricing_model && tool.pricing_model !== 'unknown') {
    pricingBadge = tool.pricing_model.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // CTA URL (affiliate takes priority over website)
  const ctaUrl = tool.affiliate_url || tool.website_url || '#';
  const ctaLabel = tool.affiliate_url ? `Try ${name} (Affiliate Link)` : `Visit ${name}`;
  const ctaRel = tool.affiliate_url ? 'sponsored noopener noreferrer' : 'noopener noreferrer';

  // Affiliate disclosure note
  const affiliateNote = tool.affiliate_url
    ? `<p class="tool-affiliate-note"><em>Disclosure: This page may contain affiliate links. If you sign up through our link, we may earn a commission at no extra cost to you. See our <a href="/disclosure.html">Affiliate Disclosure</a>.</em></p>`
    : '';

  // Build sections
  const prosList  = buildList(tool.pros || [], 'tool-pros-list');
  const consList  = buildList(tool.cons || [], 'tool-cons-list');
  const bestFor   = buildList(tool.best_for || [], 'tool-bestfor-list');

  // Feature groups
  let featuresHtml = '';
  if (tool.feature_groups && Object.keys(tool.feature_groups).length > 0) {
    const groups = Array.isArray(tool.feature_groups)
      ? tool.feature_groups
      : Object.values(tool.feature_groups);
    featuresHtml = groups.map(group => {
      if (!group || !group.items) return '';
      return `<div class="tool-feature-group">
              <h4>${escAttr(group.group || 'Features')}</h4>
              ${buildList(group.items, 'tool-feature-list')}
            </div>`;
    }).filter(Boolean).join('\n');
  }

  // Pricing overview
  const pricingHtml = tool.pricing_overview
    ? `<div class="tool-section">
        <h2>Pricing</h2>
        <div class="tool-body-text">${tool.pricing_overview}</div>
      </div>`
    : '';

  // How it works
  const howHtml = tool.how_it_works
    ? `<div class="tool-section">
        <h2>How It Works</h2>
        <div class="tool-body-text">${tool.how_it_works}</div>
      </div>`
    : '';

  // Comparison summary
  const compHtml = tool.comparison_summary
    ? `<div class="tool-section">
        <h2>How It Compares</h2>
        <div class="tool-body-text">${tool.comparison_summary}</div>
      </div>`
    : '';

  // SoftwareApplication JSON-LD
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    'name': name,
    'applicationCategory': `${category} Software`,
    'operatingSystem': 'Web',
    'url': tool.website_url || canonicalUrl,
    'description': metaDesc,
    'offers': tool.has_free_tier ? { '@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' } : undefined,
    'publisher': {
      '@type': 'Organization',
      'name': 'WhichAIPick',
      'url': DOMAIN
    }
  };
  // Remove undefined keys
  Object.keys(schema).forEach(k => schema[k] === undefined && delete schema[k]);

  return `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escAttr(metaTitle)}</title>
  <meta name="description" content="${escAttr(metaDesc)}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="${canonicalUrl}">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escAttr(metaTitle)}">
  <meta property="og:description" content="${escAttr(metaDesc)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:image" content="${DOMAIN}/assets/logo/logo-final.png">

  <!-- Twitter -->
  <meta property="twitter:card" content="summary">
  <meta property="twitter:title" content="${escAttr(metaTitle)}">
  <meta property="twitter:description" content="${escAttr(metaDesc)}">

  <!-- Favicon -->
  <link rel="icon" href="/favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">

  <!-- Styles -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/styles.css?v=2.6">
  <link rel="stylesheet" href="/css/pages/tool.css">

  <!-- AdSense Verification & Consent -->
  <meta name="google-adsense-account" content="ca-pub-7088331504377019">
  <script src="/js/consent.js" defer></script>

  <!-- Schema: SoftwareApplication -->
  <script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>
</head>

<body data-bg="tool">
  ${HEADER_SHELL}

  <main class="page-shell">
    <div class="page-container">
      <div class="tool-detail-page">

        <!-- Back link -->
        <div class="tool-back-link">
          <a href="/category/${catSlug}/">← Back to ${category}</a>
        </div>

        <!-- Hero -->
        <div class="tool-hero">
          <div class="tool-hero-meta">
            <span class="tool-hero-category">${escAttr(category)}</span>
            ${pricingBadge ? `<span class="tool-hero-pricing">${escAttr(pricingBadge)}</span>` : ''}
          </div>
          <h1 class="tool-name">${escAttr(name)}</h1>
          <div class="tool-summary">
            ${tool.long_description || `<p>${escAttr(name)} is an AI-powered tool in the ${escAttr(category)} category.</p>`}
          </div>
          ${ctaUrl !== '#' ? `<a href="${escAttr(ctaUrl)}" target="_blank" rel="${ctaRel}" class="btn btn-primary btn-lg tool-cta">${escAttr(ctaLabel)}</a>` : ''}
        </div>

        ${affiliateNote}

        <!-- Best For -->
        ${(tool.best_for && tool.best_for.length > 0) ? `<div class="tool-section">
          <h2>Best For</h2>
          ${bestFor}
        </div>` : ''}

        <!-- Main Description / How It Works -->
        ${howHtml}

        <!-- Features -->
        ${featuresHtml ? `<div class="tool-section">
          <h2>Key Features</h2>
          ${featuresHtml}
        </div>` : ''}

        <!-- Pros & Cons -->
        ${(prosList || consList) ? `<div class="tool-section">
          <h2>Pros &amp; Cons</h2>
          <div class="tool-pros-cons">
            ${prosList ? `<div class="tool-pros"><h3>Pros</h3>${prosList}</div>` : ''}
            ${consList ? `<div class="tool-cons"><h3>Cons</h3>${consList}</div>` : ''}
          </div>
        </div>` : ''}

        <!-- Pricing -->
        ${pricingHtml}

        <!-- How It Compares -->
        ${compHtml}

        <!-- Bottom CTA -->
        ${ctaUrl !== '#' ? `<div class="tool-section tool-cta-section">
          <a href="${escAttr(ctaUrl)}" target="_blank" rel="${ctaRel}" class="btn btn-primary btn-lg">${escAttr(ctaLabel)}</a>
          <p class="tool-back-to-cat"><a href="/category/${catSlug}/">Browse more ${escAttr(category)} tools →</a></p>
        </div>` : ''}

      </div>
    </div>
  </main>

  ${FOOTER_HTML}

  <script src="/js/main.js?v=6.4"></script>
  <script src="/js/layout.js?v=1.8" defer></script>
</body>

</html>`;
}

// ─── CATEGORY PAGE GENERATOR ──────────────────────────────────────────────────
function buildCategoryPage(categoryName, categoryTools) {
  const slug         = categorySlug(categoryName);
  const canonicalUrl = `${DOMAIN}/category/${slug}/`;
  const meta         = CATEGORY_META[categoryName] || {};
  const intro        = meta.intro || `Browse AI tools in the ${categoryName} category.`;
  const description  = meta.description || `Discover the best ${categoryName} AI tools, with honest editorial reviews, pricing information, and use case breakdowns.`;
  const faq          = meta.faq || [];

  const metaTitle = `Best AI ${categoryName} Tools in 2026 | WhichAIPick`;
  const metaDesc  = truncate(`${intro} Browse ${categoryTools.length} curated AI tools with honest reviews, pricing, and use case breakdowns.`, 160);

  // Tool cards
  const toolCardsHtml = categoryTools.map(tool => {
    const toolUrl   = `/tools/${tool.id}/`;
    const toolDesc  = truncate(stripHtml(tool.long_description || ''), 120);
    const priceBadge = tool.has_free_tier ? '<span class="tool-card-badge">Free Tier</span>' : '';
    return `<a href="${toolUrl}" class="tool-card-static">
          <div class="tool-card-header">
            <h3 class="tool-card-name">${escAttr(tool.name)}</h3>
            ${priceBadge}
          </div>
          <p class="tool-card-desc">${escAttr(toolDesc)}</p>
          <span class="tool-card-link">View details →</span>
        </a>`;
  }).join('\n        ');

  // FAQ HTML
  const faqHtml = faq.length > 0
    ? `<div class="tool-section category-faq">
        <h2>Frequently Asked Questions</h2>
        ${faq.map(({q, a}) => `<div class="faq-item">
          <h3 class="faq-question">${escAttr(q)}</h3>
          <p class="faq-answer">${escAttr(a)}</p>
        </div>`).join('\n        ')}
      </div>`
    : '';

  // ItemList JSON-LD
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    'name': metaTitle,
    'description': metaDesc,
    'url': canonicalUrl,
    'publisher': { '@type': 'Organization', 'name': 'WhichAIPick', 'url': DOMAIN },
    'mainEntity': {
      '@type': 'ItemList',
      'name': `AI ${categoryName} Tools`,
      'numberOfItems': categoryTools.length,
      'itemListElement': categoryTools.slice(0, 20).map((tool, i) => ({
        '@type': 'ListItem',
        'position': i + 1,
        'url': `${DOMAIN}/tools/${tool.id}/`,
        'name': tool.name
      }))
    }
  };

  return `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escAttr(metaTitle)}</title>
  <meta name="description" content="${escAttr(metaDesc)}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="${canonicalUrl}">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escAttr(metaTitle)}">
  <meta property="og:description" content="${escAttr(metaDesc)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:image" content="${DOMAIN}/assets/logo/logo-final.png">

  <!-- Twitter -->
  <meta property="twitter:card" content="summary">
  <meta property="twitter:title" content="${escAttr(metaTitle)}">
  <meta property="twitter:description" content="${escAttr(metaDesc)}">

  <!-- Favicon -->
  <link rel="icon" href="/favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">

  <!-- Styles -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/styles.css?v=2.6">

  <!-- AdSense Verification & Consent -->
  <meta name="google-adsense-account" content="ca-pub-7088331504377019">
  <script src="/js/consent.js" defer></script>

  <!-- Schema: CollectionPage + ItemList -->
  <script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>
</head>

<body data-bg="browse">
  ${HEADER_SHELL}

  <main class="page-shell">

    <!-- Category Hero -->
    <section class="hero-shell">
      <div class="hero-surface">
        <div class="hero-inner">
          <h1>AI ${escAttr(categoryName)} Tools</h1>
          <div class="content-narrow">
            <p>${escAttr(intro)}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Description -->
    <section class="section-spaced">
      <div class="content-narrow">
        <p class="category-description">${escAttr(description)}</p>
        <p style="color: var(--c-text-muted); margin-top: 12px;">${categoryTools.length} tools curated and reviewed by the WhichAIPick editorial team.</p>
      </div>
    </section>

    <!-- Tool Grid -->
    <section class="section-spaced">
      <div class="content-wide">
        <div class="tools-grid-static">
        ${toolCardsHtml}
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="section-spaced">
      <div class="content-narrow">
        ${faqHtml}
      </div>
    </section>

    <!-- Back to all categories -->
    <section class="section-spaced" style="text-align:center; padding-bottom: var(--space-8);">
      <a href="/category.html" class="btn btn-secondary">Browse All Categories</a>
    </section>

  </main>

  ${FOOTER_HTML}

  <script src="/js/main.js?v=6.4"></script>
  <script src="/js/layout.js?v=1.8" defer></script>
</body>

</html>`;
}

// ─── Run Generation ───────────────────────────────────────────────────────────
let toolsGenerated      = 0;
let categoriesGenerated = 0;

// 1) Tool pages
console.log('Generating tool pages…');
for (const tool of tools) {
  const outDir  = path.join(ROOT, 'tools', tool.id);
  const outFile = path.join(outDir, 'index.html');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, buildToolPage(tool), 'utf8');
  toolsGenerated++;
}
console.log(`  ✓ ${toolsGenerated} tool pages written to /tools/[id]/index.html`);

// 2) Category pages
console.log('Generating category pages…');
const categories = [...new Set(tools.map(t => t.category).filter(Boolean))];
for (const cat of categories) {
  const catTools = tools.filter(t => t.category === cat);
  const slug     = categorySlug(cat);
  const outDir   = path.join(ROOT, 'category', slug);
  const outFile  = path.join(outDir, 'index.html');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, buildCategoryPage(cat, catTools), 'utf8');
  categoriesGenerated++;
  console.log(`  [GENERATED] /category/${slug}/  (${catTools.length} tools)`);
}
console.log(`  ✓ ${categoriesGenerated} category pages written to /category/[slug]/index.html`);

console.log(`\nPhase 3 generation complete: ${toolsGenerated} tool pages + ${categoriesGenerated} category pages.`);
