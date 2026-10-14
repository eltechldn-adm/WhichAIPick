const PRODUCTION_REQUIRED_OPTIONS = ['canonicalUrl', 'robots', 'metaTitle', 'metaDescription', 'domain', 'headerHtml', 'footerHtml', 'consentHeadHtml'];

/**
 * Renders a Tool Page V2 document.
 *
 * options === undefined/null  -> isolated preview document (noindex, no site shell). Output unchanged.
 * options.mode === 'production' -> same V2 body inside the standard site shell:
 *   canonical + robots + social meta, consent/AdSense head block, header/footer shells.
 *   Used only by the explicitly allowlisted canary path in generate-static-pages.mjs.
 */
export function renderToolPageV2(viewModel, options = null) {
    const production = options !== null && options !== undefined;
    if (production) {
        if (options.mode !== 'production') {
            throw new Error(`renderToolPageV2: unsupported options.mode "${options.mode}"`);
        }
        for (const key of PRODUCTION_REQUIRED_OPTIONS) {
            if (typeof options[key] !== 'string' || options[key] === '') {
                throw new Error(`renderToolPageV2: production mode requires options.${key}`);
            }
        }
    }
    const { identity, classification, summary, pricing, platforms, capabilities, audience, eligibility, lifecycle, editorial, trust, commercial, schemaSafe, relationships } = viewModel;

    const escapeHtml = (unsafe) => {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    const stripHtmlToText = (htmlContent) => {
        if (!htmlContent) return '';
        let text = htmlContent
            .replace(/<\/?p[^>]*>/gi, ' ')
            .replace(/<br[^>]*>/gi, ' ')
            .replace(/<\/li>/gi, ' ')
            .replace(/<li[^>]*>/gi, ' • ');
        text = text.replace(/<[^>]+>/g, '');
        text = text.replace(/\s+/g, ' ').trim();
        return text;
    };

    let longDescText = stripHtmlToText(editorial.longDescription?.value);
    let howItWorksText = stripHtmlToText(editorial.howItWorks?.value);

    if (identity.id === 'midjourney') {
        const lowerDesc = longDescText.toLowerCase();
        const lowerHow = howItWorksText.toLowerCase();
        const hasContradiction = [lowerDesc, lowerHow].some(t =>
            t.includes('requires discord') ||
            t.includes('discord-only') ||
            t.includes('does not offer a traditional web app')
        );
        if (hasContradiction) {
            longDescText = '';
            howItWorksText = '';
        }
    }

    const schema = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": schemaSafe.name,
    };
    if (schemaSafe.url) schema.url = schemaSafe.url;
    if (schemaSafe.applicationCategory) schema.applicationCategory = schemaSafe.applicationCategory;
    if (schemaSafe.operatingSystems && schemaSafe.operatingSystems.length > 0) schema.operatingSystem = schemaSafe.operatingSystems.join(', ');
    if (schemaSafe.descriptionCandidate) schema.description = schemaSafe.descriptionCandidate;
    schema.publisher = { "@type": "Organization", "name": "WhichAIPick" };

    const schemaString = JSON.stringify(schema);

    const previewHead = `    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(identity.name)} | Tool Page V2 Preview</title>
    <meta name="robots" content="noindex,nofollow">
    <link rel="stylesheet" href="/css/global.css">
    <link rel="stylesheet" href="/css/pages/tool-page-v2.css">
    <script type="application/ld+json">
        ${schemaString}
    </script>`;

    let headInner = previewHead;
    let bodyOpen = '<body>';
    let bodyClose = '</body>';
    if (production) {
        const title = escapeHtml(options.metaTitle);
        const desc = escapeHtml(options.metaDescription);
        const canonical = escapeHtml(options.canonicalUrl);
        headInner = `    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${desc}">
    <meta name="robots" content="${escapeHtml(options.robots)}">
    <link rel="canonical" href="${canonical}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${desc}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${escapeHtml(options.domain)}/assets/logo/logo-final.png">
    <meta property="twitter:card" content="summary">
    <meta property="twitter:title" content="${title}">
    <meta property="twitter:description" content="${desc}">
    <link rel="icon" href="/favicon.ico">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/css/styles.css?v=2.6">
    <link rel="stylesheet" href="/css/pages/tool-page-v2.css">
${options.consentHeadHtml}
    <script type="application/ld+json">
        ${schemaString}
    </script>`;
        bodyOpen = `<body data-bg="tool">
${options.headerHtml}
<main id="main-content">`;
        bodyClose = `</main>
${options.footerHtml}
<script src="/js/main.js?v=6.4"></script>
<script src="/js/layout.js?v=1.8" defer></script>
</body>`;
    }

    const affiliateDisclosure = (production && commercial.hasAffiliateRelationship)
        ? `<p class="tool-v2-affiliate-note"><em>Disclosure: This page may contain affiliate links. If you sign up through our link, we may earn a commission at no extra cost to you. See our <a href="/disclosure.html">Affiliate Disclosure</a>.</em></p>`
        : '';

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
${headInner}
</head>
${bodyOpen}
    <div class="tool-page-v2">
        <div class="container">
            <div class="tool-v2-breadcrumb">
                <a href="/">Home</a> &gt; <a href="/tools/">Tools</a> &gt; ${escapeHtml(identity.name)}
            </div>

            <div class="tool-v2-hero">
                ${identity.category ? `<span class="tool-v2-category">${escapeHtml(identity.category)}</span>` : ''}
                <h1>${escapeHtml(identity.name)}</h1>
                ${summary.shortDescription ? `<p class="tool-v2-description">${escapeHtml(summary.shortDescription)}</p>` : ''}
                <div class="tool-v2-cta-group">
                    ${identity.websiteUrl ? `<a href="${escapeHtml(commercial.affiliateUrl || identity.websiteUrl)}" target="_blank" rel="${commercial.hasAffiliateRelationship ? 'sponsored ' : ''}noopener noreferrer" class="tool-v2-btn-primary">Visit Website</a>` : ''}
                    <a href="/compare#tools=${escapeHtml(identity.id)}" class="tool-v2-btn-secondary">Compare ${escapeHtml(identity.name)}</a>
                </div>${affiliateDisclosure}
            </div>

            <div class="tool-v2-layout">
                <div class="tool-v2-main">
                    ${(longDescText || howItWorksText) ? `
                        <section class="tool-v2-section">
                            <h2>Editorial Overview</h2>
                            <div class="tool-v2-editorial">
                                ${longDescText ? `<p>${escapeHtml(longDescText)}</p>` : ''}
                                ${howItWorksText ? `<h3>How it works</h3><p>${escapeHtml(howItWorksText)}</p>` : ''}
                            </div>
                        </section>
                    ` : ''}

                    ${(audience.bestFor.length > 0 || audience.notIdealFor.length > 0) ? `
                        <section class="tool-v2-section">
                            <h2>Who is it for?</h2>
                            ${audience.bestFor.length > 0 ? `
                                <h3>Best For</h3>
                                <ul class="tool-v2-list">
                                    ${audience.bestFor.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
                                </ul>
                            ` : ''}
                            ${audience.notIdealFor.length > 0 ? `
                                <h3 style="margin-top: 1rem;">Not Ideal For</h3>
                                <ul class="tool-v2-list">
                                    ${audience.notIdealFor.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
                                </ul>
                            ` : ''}
                        </section>
                    ` : ''}

                    ${audience.primaryUseCases.length > 0 ? `
                        <section class="tool-v2-section">
                            <h2>Primary Use Cases</h2>
                            <div class="tool-v2-chips">
                                ${audience.primaryUseCases.map(item => `<span class="tool-v2-chip">${escapeHtml(item)}</span>`).join('')}
                            </div>
                        </section>
                    ` : ''}

                    <section class="tool-v2-section">
                        <h2>Pricing & Access</h2>
                        <ul class="tool-v2-list">
                            <li>Pricing Model: ${pricing.model ? escapeHtml(pricing.model) : 'Not confirmed'}</li>
                            <li>Starting Price: ${pricing.display.startingPriceLabel ? escapeHtml(pricing.display.startingPriceLabel) : 'Published starting price not confirmed'}</li>
                            <li>Free Tier: ${escapeHtml(pricing.display.freeTierLabel)}</li>
                            <li>Free Trial: ${escapeHtml(pricing.display.trialLabel)}</li>
                        </ul>
                    </section>

                    <section class="tool-v2-section">
                        <h2>Platforms & Technical Capabilities</h2>
                        ${platforms.interfaces.length > 0 ? `
                            <h3>Interfaces</h3>
                            <div class="tool-v2-chips" style="margin-bottom: 1rem;">
                                ${platforms.interfaces.map(item => `<span class="tool-v2-chip">${escapeHtml(item)}</span>`).join('')}
                            </div>
                        ` : ''}
                        ${platforms.operatingSystems.length > 0 ? `
                            <h3>Operating Systems</h3>
                            <div class="tool-v2-chips" style="margin-bottom: 1rem;">
                                ${platforms.operatingSystems.map(item => `<span class="tool-v2-chip">${escapeHtml(item)}</span>`).join('')}
                            </div>
                        ` : ''}
                        ${platforms.technicalAccess.length > 0 ? `
                            <h3>Technical Access</h3>
                            <div class="tool-v2-chips">
                                ${platforms.technicalAccess.map(item => `<span class="tool-v2-chip">${escapeHtml(item)}</span>`).join('')}
                            </div>
                        ` : ''}
                    </section>

                    ${relationships.featuredComparisons.length > 0 ? `
                        <section class="tool-v2-section">
                            <h2>Featured Comparisons</h2>
                            <ul class="tool-v2-list">
                                ${relationships.featuredComparisons.map(comp => `<li><a href="${escapeHtml(comp.url)}">${escapeHtml(comp.title)}</a></li>`).join('')}
                            </ul>
                        </section>
                    ` : ''}

                    ${trust.display.trustLabel ? `
                        <section class="tool-v2-trust">
                            <h2>Trust & Verification</h2>
                            <p>${escapeHtml(trust.display.trustLabel)}</p>
                            ${trust.evidenceReviewedAt ? `<p>Last Reviewed: ${escapeHtml(trust.evidenceReviewedAt)}</p>` : ''}
                            <div class="tool-v2-trust-links">
                                <a href="/review-methodology.html">Review Methodology</a> | <a href="/corrections-policy.html">Request a Correction</a>
                            </div>
                        </section>
                    ` : ''}
                </div>

                <div class="tool-v2-sidebar">
                    <div class="tool-v2-quick-facts">
                        <h2 style="font-size: 1.25rem; margin-top: 0;">Quick Facts</h2>
                        <div class="tool-v2-fact-grid">
                            <div class="tool-v2-fact-item">
                                <span class="tool-v2-fact-label">Experience</span>
                                <span class="tool-v2-fact-value">${audience.display.experienceLevelLabel ? escapeHtml(audience.display.experienceLevelLabel) : 'Not confirmed'}</span>
                            </div>
                            <div class="tool-v2-fact-item">
                                <span class="tool-v2-fact-label">Pricing Model</span>
                                <span class="tool-v2-fact-value">${pricing.model ? escapeHtml(pricing.model) : 'Not confirmed'}</span>
                            </div>
                            <div class="tool-v2-fact-item">
                                <span class="tool-v2-fact-label">API</span>
                                <span class="tool-v2-fact-value">${escapeHtml(capabilities.display.apiLabel)}</span>
                            </div>
                            <div class="tool-v2-fact-item">
                                <span class="tool-v2-fact-label">Open Source</span>
                                <span class="tool-v2-fact-value">${escapeHtml(capabilities.display.openSourceLabel)}</span>
                            </div>
                            <div class="tool-v2-fact-item">
                                <span class="tool-v2-fact-label">Self-Hosting</span>
                                <span class="tool-v2-fact-value">${capabilities.selfHosted === false ? 'No self-hosted option confirmed' : escapeHtml(capabilities.display.selfHostedLabel)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <footer class="tool-v2-footer">
                <a href="/review-methodology.html">Review Methodology</a> &middot; <a href="/corrections-policy.html">Request a Correction</a>
            </footer>
        </div>
    </div>
${bodyClose}
</html>`;
    return html.replace(/[ 	]+$/gm, '');
}
