export function renderToolPageV2(viewModel) {
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

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(identity.name)} | Tool Page V2 Preview</title>
    <meta name="robots" content="noindex,nofollow">
    <link rel="stylesheet" href="/css/global.css">
    <link rel="stylesheet" href="/css/pages/tool-page-v2.css">
    <script type="application/ld+json">
        ${schemaString}
    </script>
</head>
<body>
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
                    ${identity.websiteUrl ? `<a href="${escapeHtml(commercial.affiliateUrl || identity.websiteUrl)}" target="_blank" rel="noopener noreferrer ${commercial.hasAffiliateRelationship ? 'sponsored' : 'nofollow'}" class="tool-v2-btn-primary">Visit Website</a>` : ''}
                    <a href="/compare#tools=${escapeHtml(identity.id)}" class="tool-v2-btn-secondary">Compare ${escapeHtml(identity.name)}</a>
                </div>
            </div>

            <div class="tool-v2-layout">
                <div class="tool-v2-main">
                    ${(editorial.longDescription?.value || editorial.howItWorks?.value) ? `
                        <section class="tool-v2-section">
                            <h2>Editorial Overview</h2>
                            <div class="tool-v2-editorial">
                                ${editorial.longDescription?.value ? `<p>${escapeHtml(editorial.longDescription.value)}</p>` : ''}
                                ${editorial.howItWorks?.value ? `<h3>How it works</h3><p>${escapeHtml(editorial.howItWorks.value)}</p>` : ''}
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
                                ${relationships.featuredComparisons.map(comp => `<li>${escapeHtml(comp)}</li>`).join('')}
                            </ul>
                        </section>
                    ` : ''}

                    ${trust.display.trustLabel ? `
                        <section class="tool-v2-trust">
                            <h2>Trust & Verification</h2>
                            <p>${escapeHtml(trust.display.trustLabel)}</p>
                            ${trust.evidenceReviewedAt ? `<p>Last Reviewed: ${escapeHtml(trust.evidenceReviewedAt)}</p>` : ''}
                            <div class="tool-v2-trust-links">
                                <a href="#">Review Methodology</a> | <a href="#">Request a Correction</a>
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
                <a href="#">Review Methodology</a> &middot; <a href="#">Request a Correction</a>
            </footer>
        </div>
    </div>
</body>
</html>`;
    return html.replace(/[ 	]+$/gm, '');
}
