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

  // Logo (3-tier fallback matching main.js)
  const initials = (name || '??').trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  let domain = 'N/A';
  if (tool.website_url) {
    try {
      const urlObj = new URL(tool.website_url.startsWith('http') ? tool.website_url : 'https://' + tool.website_url);
      domain = urlObj.hostname.replace('www.', '');
    } catch (e) {}
  }
  const faviconUrl = domain && domain !== 'N/A'
    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
    : '';

  let logoHTML;
  if (tool.logo_url) {
      logoHTML = `<img class="tool-page-logo" src="${tool.logo_url}" alt="${escAttr(name)} logo" width="64" height="64" loading="lazy"
          onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="tool-page-logo-initials" style="display:none;">${initials}</div>`;
  } else if (faviconUrl) {
      logoHTML = `<img class="tool-page-logo" src="${faviconUrl}" alt="${escAttr(name)} logo" width="64" height="64" loading="lazy"
          onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="tool-page-logo-initials" style="display:none;">${initials}</div>`;
  } else {
      logoHTML = `<div class="tool-page-logo-initials">${initials}</div>`;
  }

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
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7088331504377019"
     crossorigin="anonymous"></script>
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
          <a href="/tools/">← Back to All Tools</a>
        </div>

        <!-- Hero -->
        <div class="tool-hero">
          <div class="tool-hero-meta">
            <span class="tool-hero-category">${escAttr(category)}</span>
            ${pricingBadge ? `<span class="tool-hero-pricing">${escAttr(pricingBadge)}</span>` : ''}
          </div>
          <div class="tool-hero-header">
            ${logoHTML}
            <h1 class="tool-name">${escAttr(name)}</h1>
            <button class="shortlist-toggle-btn shortlist-toggle-btn--large" data-tool-id="${tool.id}" aria-label="Save ${escAttr(name)} to Shortlist" style="margin-left: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 50%; padding: 12px; cursor: pointer; color: var(--c-text-muted); transition: all var(--t-fast); display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            </button>
          </div>
          <div class="tool-summary">
            ${tool.long_description || `<p>${escAttr(name)} is an AI-powered tool in the ${escAttr(category)} category.</p>`}
          </div>
          ${ctaUrl !== '#' ? `<a href="${escAttr(ctaUrl)}" target="_blank" rel="${ctaRel}" class="btn btn-primary btn-lg tool-cta">${escAttr(ctaLabel)}</a>` : ''}
          <div class="tool-editorial-links text-center" style="margin-top: 1.5rem; font-size: 0.85rem; color: var(--c-text-muted);">
            <p>Our tools are evaluated against our <a href="/review-methodology.html" style="color: var(--c-accent); text-decoration: underline;">Scoring Methodology</a>. <br>Spot an error? <a href="/corrections-policy.html" style="color: var(--c-accent); text-decoration: underline;">Request a Correction</a>.</p>
          </div>
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

        <!-- Strengths & Limitations -->
        ${(prosList || consList) ? `<div class="tool-section">
          <h2>Strengths & Limitations</h2>
          <div class="tool-pros-cons">
            ${prosList ? `<div class="tool-pros"><h3>Strengths</h3>${prosList}</div>` : ''}
            ${consList ? `<div class="tool-cons"><h3>Limitations</h3>${consList}</div>` : ''}
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


function buildToolCardHTML(tool) {
    const toolUrl   = `/tools/${tool.id}/`;
    const toolDesc  = truncate(stripHtml(tool.long_description || ''), 120);
    const priceBadgeHTML = tool.has_free_tier ? `<div class="tool-card-badge">Free Tier</div>` : '';
    const domain = tool.website_url ? (new URL(tool.website_url).hostname.replace(/^www\./, '')) : 'N/A';
    
    // Tier 3: Local initials badge (pure CSS/DOM)
    const initials = (tool.name || '??').trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
    const faviconUrl = domain && domain !== 'N/A' ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : '';
    
    let logoHTML;
    if (tool.logo_url) {
        logoHTML = `<img class="tool-logo" src="${escAttr(tool.logo_url)}" alt="${escAttr(tool.name)} logo" width="44" height="44" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="tool-logo-initials" style="display:none;">${escAttr(initials)}</div>`;
    } else if (faviconUrl) {
        logoHTML = `<img class="tool-logo" src="${escAttr(faviconUrl)}" alt="${escAttr(tool.name)} logo" width="44" height="44" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="tool-logo-initials" style="display:none;">${escAttr(initials)}</div>`;
    } else {
        logoHTML = `<div class="tool-logo-initials">${escAttr(initials)}</div>`;
    }

    return `<div class="tool-card">
      ${priceBadgeHTML}
      <div class="tool-card-top ${priceBadgeHTML ? '' : 'tool-card-top--no-badge'}">
        <div class="tool-logo-wrap">${logoHTML}</div>
        <div class="tool-card-meta">
          <div class="tool-card-meta-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <h3 class="tool-name" style="margin: 0;">
              <a href="${toolUrl}" aria-label="View details for ${escAttr(tool.name)}">${escAttr(tool.name)}</a>
            </h3>
            <button class="shortlist-toggle-btn" data-tool-id="${tool.id}" aria-label="Save ${escAttr(tool.name)} to Shortlist">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            </button>
          </div>
          <div class="tool-category" style="margin-top: 4px;">${escAttr(tool.category) || 'Uncategorized'}</div>
        </div>
      </div>
      <p class="tool-description">${escAttr(toolDesc) || '&nbsp;'}</p>
      <div class="tool-card-actions">
        <a href="${toolUrl}" class="tc-btn-primary" aria-label="View full details for ${escAttr(tool.name)}">View Details</a>
        ${tool.website_url 
            ? `<a href="${escAttr(tool.website_url)}" target="_blank" rel="noopener noreferrer" class="tc-btn-secondary" aria-label="Visit ${escAttr(tool.name)} website">${escAttr(domain !== 'N/A' ? domain : 'Visit site')}</a>` 
            : ''}
      </div>
    </div>`;
}

// ─── CATEGORY PAGE GENERATOR ──────────────────────────────────────────────────
function buildCategoryPage(categoryName, categoryTools) {
  const slug         = categorySlug(categoryName);
  const canonicalUrl = `${DOMAIN}/category/${slug}/`;
  const meta         = CATEGORY_META[categoryName] || {};
  const intro        = meta.intro || `Browse AI tools in the ${categoryName} category.`;
  const description  = meta.description || `Discover the best ${categoryName} AI tools, with structured feature breakdowns and pricing data.`;
  const faq          = meta.faq || [];

  const metaTitle = `Best AI ${categoryName} Tools in 2026 | WhichAIPick`;
  const metaDesc  = truncate(`${intro} Browse ${categoryTools.length} AI tools with detailed feature breakdowns and pricing data.`, 160);

  // Tool cards using standard .tool-card layout (matching js/main.js)
  const toolCardsHtml = categoryTools.map(tool => buildToolCardHTML(tool)).join('\n        ');

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
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7088331504377019"
     crossorigin="anonymous"></script>
  <script src="/js/consent.js" defer></script>

  <!-- Schema: CollectionPage + ItemList -->
  <script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>
</head>

<body data-bg="browse">
  ${HEADER_SHELL}

  <main class="page-shell">

    <!-- Category Hero -->
    <section class="hero-shell" style="padding-bottom: 16px;">
      <div class="hero-surface">
        <div class="hero-inner">
          <h1>AI ${escAttr(categoryName)} Tools</h1>
          <div class="content-narrow">
            <p style="font-size: 1.1rem; margin-top: 0; margin-bottom: 12px;">${escAttr(intro)}</p>
            <p class="category-description" style="margin-top: 0; margin-bottom: 12px; font-size: 0.95rem;">${escAttr(description)}</p>
            <p style="color: var(--c-text-muted); font-size: 0.85rem; margin-top: 0; margin-bottom: 0;">${categoryTools.length} tools researched and verified for feature accuracy and pricing.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Directory Layout (Dynamic) -->
    <div class="page-container directory-layout">
      <!-- Filter Sidebar (Desktop) -->
      <aside class="directory-sidebar" id="directory-sidebar">
        <div class="directory-sidebar-header mobile-only">
          <h2>Filters</h2>
          <button class="close-sidebar-btn" id="close-sidebar-btn" aria-label="Close filters">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="filter-group">
          <label for="search-input" class="filter-group-title">Search</label>
          <input type="search" id="search-input" class="directory-search-input" placeholder="Search tools..." aria-label="Search tools by name or description">
        </div>

        <div class="filter-group">
          <label for="sort-select" class="filter-group-title">Sort By</label>
          <select id="sort-select" class="directory-sort-select" aria-label="Sort tools">
            <option value="recommended">Recommended</option>
            <option value="az">A–Z</option>
            <option value="za">Z–A</option>
            <option value="free_first">Free First</option>
          </select>
        </div>

        <div class="filter-group" id="filter-group-freeTier">
          <h3 class="filter-group-title">Access</h3>
          <label class="filter-checkbox-label">
            <input type="checkbox" name="freeTier" value="has_free_tier"> Has Free Tier
          </label>
          <label class="filter-checkbox-label">
            <input type="checkbox" name="freeTier" value="no_free_tier"> No Free Tier
          </label>
        </div>

        <div class="filter-group" id="filter-group-pricing">
          <h3 class="filter-group-title">Pricing Model</h3>
          <div id="pricing-checkboxes">
             <!-- Injected by JS -->
          </div>
        </div>

        <div class="filter-group" id="filter-group-category" style="display: none;">
          <h3 class="filter-group-title">Category</h3>
          <div id="category-checkboxes" class="scrollable-checkboxes">
             <!-- Injected by JS, hidden since this is a specific category page -->
          </div>
        </div>

        <div class="filter-group" id="filter-group-useCase">
          <h3 class="filter-group-title">Use Case</h3>
          <div id="usecase-checkboxes" class="scrollable-checkboxes">
             <!-- Injected by JS -->
          </div>
        </div>
      </aside>

      <!-- Main Results Area -->
      <div class="directory-results">
        <div class="directory-header mobile-only">
          <button class="btn btn-secondary mobile-filters-btn" id="mobile-filters-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            Filters
          </button>
        </div>

        <!-- Active Filter Chips -->
        <div class="active-filters" id="active-filters" style="display: none;">
          <div class="active-filters-list" id="active-filters-list"></div>
          <button class="clear-filters-btn" id="clear-filters-btn">Clear all</button>
        </div>

        <div class="directory-stats-bar">
          <div id="directory-count" class="directory-count" aria-live="polite">Showing 1-${Math.min(30, categoryTools.length)} of ${categoryTools.length} tools</div>
        </div>

        <div id="directory-empty-state" class="directory-empty-state" style="display: none;">
          <h3>No tools match your criteria</h3>
          <p>Try adjusting or clearing your filters to find what you're looking for.</p>
          <button class="btn btn-primary" id="empty-clear-btn">Clear Filters</button>
        </div>

        <div id="browse-list" class="browse-list">
          ${toolCardsHtml}
        </div>
        
        <div id="load-more-container" class="load-more-container"></div>
      </div>
    </div>

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
  <script src="/js/descriptions.js?v=1.7"></script>
  <script src="/js/layout.js?v=1.8" defer></script>
  <script>window.BROWSE_CONFIG = { category: '${escAttr(categoryName)}' };</script>
  <script src="/js/browse.js?v=1.0" defer></script>
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


// 3) Update category.html (The Directory Hub)
console.log('Injecting static content into category.html...');
const categoryHtmlFile = path.join(ROOT, 'category.html');
let categoryFileContent = fs.readFileSync(categoryHtmlFile, 'utf8');

const categoryIcons = {
  'Automation': '<path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'Business': '<path d="M3 21H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 21V7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 21V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 21V9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 9H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'Content Creation': '<path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'Design': '<path d="M12 19L19 12L22 15L15 22L12 19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 13L16.5 5.5L2 2L5.5 16.5L13 18L18 13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 2L9.586 9.586" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 13C11 13 11 14.5 13 16.5C15 18.5 16.5 18.5 16.5 18.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'Development': '<path d="M16 18L22 12L16 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 6L2 12L8 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'Education': '<path d="M22 10V16C22 16.11 22 16.29 21.96 16.4L18.88 18.2C18.66 18.33 18.36 18.37 18.11 18.29C17.7 18.17 17.43 17.77 17.43 17.34V14.1L12 17L2 12V22H0V11C0 10.93 0.01 10.87 0.05 10.81L2 7L12 2L22 7V10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 13.5V18.13L12 21.5L18 18.13V13.5L12 16.5L6 13.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'Marketing': '<path d="M12 20V10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 20V4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 20V16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'Productivity': '<path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'Research': '<path d="M11 19C15.4183 19 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 21L16.65 16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'Video & Audio': '<path d="M23 7L16 12L23 17V7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 5H3C1.89543 5 1 5.89543 1 7V17C1 18.1046 1.89543 19 3 19H14C15.1046 19 16 18.1046 16 17V7C16 5.89543 15.1046 5 14 5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'default': '<path d="M21 16V8C20.9996 7.64927 20.9071 7.30481 20.7315 7.00116C20.556 6.69751 20.3037 6.44536 20 6.27L13 2.27C12.696 2.09446 12.3511 2.00205 12 2.00205C11.6489 2.00205 11.304 2.09446 11 2.27L4 6.27C3.69626 6.44536 3.44398 6.69751 3.26846 7.00116C3.09294 7.30481 3.00036 7.64927 3 8V16C3.00036 16.3507 3.09294 16.6952 3.26846 16.9988C3.44398 17.3025 3.69626 17.5546 4 17.73L11 21.73C11.304 21.9055 11.6489 21.9979 12 21.9979C12.3511 21.9979 12.696 21.9055 13 21.73L20 17.73C20.3037 17.5546 20.556 17.3025 20.7315 16.9988C20.9071 16.6952 20.9996 16.3507 21 16Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.27002 6.96002L12 12.01L20.73 6.96002" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 22.08V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
};

const allCategoriesListHtml = categories.sort().map(c => {
  let iconKey = c;
  if (!categoryIcons[c]) iconKey = 'default';
  const iconSvg = categoryIcons[iconKey];
  const count = tools.filter(t => t.category === c).length;
  const slug = categorySlug(c);
  return `
    <a href="/category/${slug}/" class="category-card cat-${slug}">
      <svg class="category-card-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          ${iconSvg}
      </svg>
      <h3>${c}</h3>
      <span class="category-card-count">${count} tools</span>
    </a>`;
}).join('');

const newMainContent = `
    <section class="section-spaced content-narrow">
      <h1 id="category-title">Browse by Category</h1>
      <p class="muted" id="category-description">Explore our curated collection of AI tools by category.</p>
    </section>

    <section class="section-spaced">
      <div class="tools-grid category-directory-grid" id="category-tools-grid" style="display: grid; gap: 16px;">
        ${allCategoriesListHtml}
      </div>
    </section>
`;

categoryFileContent = categoryFileContent.replace(
  /<main class="page-shell">[\s\S]*?<\/main>/,
  `<main class="page-shell">${newMainContent}</main>`
);

fs.writeFileSync(categoryHtmlFile, categoryFileContent, 'utf8');
console.log('  ✓ category.html updated with static grid.');

// 4) Update index.html (Homepage Featured Tools)
console.log('Injecting static content into index.html...');
const indexHtmlFile = path.join(ROOT, 'index.html');
let indexFileContent = fs.readFileSync(indexHtmlFile, 'utf8');

const featuredFallbackTools = tools.slice(0, 6);
const featuredFallbackHtml = featuredFallbackTools.map(tool => buildToolCardHTML(tool)).join('\n');

indexFileContent = indexFileContent.replace(
  /<div id="home-featured-tools" class="content-grid" style="margin-bottom: var\(--space-8\);">[\s\S]*?<\/div>\s*<div style="text-align: center;">/,
  `<div id="home-featured-tools" class="content-grid" style="margin-bottom: var(--space-8);">\n${featuredFallbackHtml}\n</div>\n                <div style="text-align: center;">`
);

// Also categories grid for index.html
const counts = {};
tools.forEach(t => {
  if (t.category) counts[t.category] = (counts[t.category] || 0) + 1;
});
const topCategories = [...categories].sort((a, b) => (counts[b] || 0) - (counts[a] || 0)).slice(0, 8);
const categoryFallbackHtml = topCategories.map(cat => {
  return `<a href="/category?c=${encodeURIComponent(cat)}" class="content-card" style="display: block; text-decoration: none; transition: transform var(--t-fast);">
    <h3 style="margin-bottom: var(--space-2); color: var(--c-text); font-size: 1.25rem;">${cat}</h3>
    <p style="color: var(--c-accent); margin: 0; font-size: 0.95rem; font-weight: 500;">${counts[cat]} Tools &rarr;</p>
  </a>`;
}).join('\n');

indexFileContent = indexFileContent.replace(
  /<div id="home-category-grid" class="content-grid"\s+style="grid-template-columns: repeat\(auto-fill, minmax\(280px, 1fr\)\); margin-bottom: var\(--space-6\);">[\s\S]*?<\/div>\s*<div style="text-align: center;">/,
  `<div id="home-category-grid" class="content-grid"
                    style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); margin-bottom: var(--space-6);">\n${categoryFallbackHtml}\n</div>\n                <div style="text-align: center;">`
);

fs.writeFileSync(indexHtmlFile, indexFileContent, 'utf8');
console.log('  ✓ index.html updated with static fallback grids.');

// 5) Update tools/index.html (Tools Directory Fallback)
console.log('Injecting static content into tools/index.html...');
const toolsIndexFile = path.join(ROOT, 'tools', 'index.html');
if (fs.existsSync(toolsIndexFile)) {
    let toolsIndexContent = fs.readFileSync(toolsIndexFile, 'utf8');
    
    // Sort logic to match the frontend (Recommended)
    let recommendedIds = [];
    try {
        const recData = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'recommended.json'), 'utf8'));
        recommendedIds = recData.recommended_ids || [];
    } catch (e) {
        console.warn('Could not load recommended.json', e.message);
    }
    
    let sortedTools = [];
    if (recommendedIds.length > 0) {
        const processed = new Set();
        recommendedIds.forEach(id => {
            const tool = tools.find(t => t.id === id);
            if (tool && tool.recommendationEligible && !processed.has(tool.id)) {
                sortedTools.push(tool);
                processed.add(tool.id);
            }
        });
        tools.forEach(tool => {
            if (tool.recommendationEligible && !processed.has(tool.id)) {
                sortedTools.push(tool);
                processed.add(tool.id);
            }
        });
        tools.forEach(tool => {
            if (!tool.recommendationEligible && !processed.has(tool.id)) {
                sortedTools.push(tool);
                processed.add(tool.id);
            }
        });
    } else {
        sortedTools = [...tools].sort((a, b) => a.name.localeCompare(b.name));
    }
    
    const fallbackTools = sortedTools.slice(0, 30);
    const fallbackHtml = fallbackTools.map(tool => buildToolCardHTML(tool)).join('\n');
    
    toolsIndexContent = toolsIndexContent.replace(
        /<!-- BROWSE_LIST_START -->[\s\S]*?<!-- BROWSE_LIST_END -->/,
        `<!-- BROWSE_LIST_START -->\n${fallbackHtml}\n<!-- BROWSE_LIST_END -->`
    );
    
    fs.writeFileSync(toolsIndexFile, toolsIndexContent, 'utf8');
    console.log('  ✓ tools/index.html updated with static fallback grid.');
} else {
    console.warn('  ! tools/index.html not found, skipped injection.');
}

console.log(`\nPhase 3 generation complete: ${toolsGenerated} tool pages + ${categoriesGenerated} category pages.`);
