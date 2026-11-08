import { escapeHTML } from '../../js/comparison-core.js';

const STATE_CLASS_MAP = {
    'Available': 'available',
    'Limited': 'limited',
    'Not offered': 'not-offered',
    'Not verified': 'not-verified'
};

/**
 * Reusable Capability Explorer section generator.
 * Designed to support ChatGPT and Claude today, and scale cleanly to
 * Google Gemini, Grok, GitHub/Microsoft Copilot, and Perplexity AI.
 */
export function renderCapabilityExplorerSection({ def, toolObjects, inventory, allSources, addSources }) {
    if (!def.capabilityExplorer?.enabled || !inventory || !Array.isArray(inventory.capabilities)) {
        return '';
    }

    const sourceMap = new Map((allSources || []).map(s => [s.sourceId, s]));
    const categories = inventory.categories || [];
    const capabilities = inventory.capabilities || [];

    // Register all used sourceIds from the active tools in the comparison
    capabilities.forEach(cap => {
        toolObjects.forEach(tool => {
            const entry = cap.providers?.[tool.id];
            if (entry?.sourceId && typeof addSources === 'function') {
                addSources([entry.sourceId]);
            }
        });
    });

    const totalCapabilities = capabilities.length;
    const totalCategories = categories.length;

    const labelVars = [
        `--label-1: 'Capability'`,
        ...toolObjects.map((t, idx) => `--label-${idx + 2}: '${escapeHTML(t.canonicalName)}'`)
    ].join('; ');

    const filterButtonsHTML = [
        `<button type="button" class="cap-filter-btn is-active" aria-pressed="true" data-cap-category="all">All categories (${totalCapabilities})</button>`,
        ...categories.map(cat => {
            const count = capabilities.filter(c => c.categoryId === cat.categoryId).length;
            return `<button type="button" class="cap-filter-btn" aria-pressed="false" data-cap-category="${escapeHTML(cat.categoryId)}">${escapeHTML(cat.title)} (${count})</button>`;
        })
    ].join('\n                            ');

    const categoriesHTML = categories.map(cat => {
        const catCaps = capabilities.filter(c => c.categoryId === cat.categoryId);
        if (catCaps.length === 0) return '';

        const rowsHTML = catCaps.map(cap => {
            const toolCellsHTML = toolObjects.map(tool => {
                const rawEntry = cap.providers?.[tool.id];
                // Never treat missing data as "No" — fall back to "Not verified"
                const entry = rawEntry || {
                    state: 'Not verified',
                    productProvidedBy: `${tool.canonicalName} (Unverified surface)`,
                    productLayer: 'Consumer app',
                    requiredPlan: 'Not verified',
                    availabilityAndLimitations: 'Capability status has not yet been verified against official vendor documentation.',
                    sourceId: null,
                    officialSourceUrl: null,
                    lastVerifiedDate: inventory.lastVerifiedAt || def.checkedAt
                };

                const stateClass = STATE_CLASS_MAP[entry.state] || 'not-verified';
                const sourceObj = entry.sourceId ? sourceMap.get(entry.sourceId) : null;
                const sourcePublisher = sourceObj ? sourceObj.publisher : 'Official source';
                const sourceTitle = sourceObj ? sourceObj.title : 'Vendor documentation';
                const sourceUrl = entry.officialSourceUrl || sourceObj?.url || '';

                const sourceLinkHTML = sourceUrl
                    ? `<a href="${escapeHTML(sourceUrl)}" target="_blank" rel="noopener noreferrer" class="cap-source-link">${escapeHTML(sourcePublisher)}: ${escapeHTML(sourceTitle)}</a>`
                    : `<span>Unverified</span>`;

                return `
                                        <td role="cell" class="capability-provider-cell">
                                            <div class="cap-badges-row">
                                                <span class="cap-state-badge cap-state--${stateClass}">${escapeHTML(entry.state)}</span>
                                                <span class="cap-layer-badge">${escapeHTML(entry.productLayer)}</span>
                                            </div>
                                            <dl class="cap-detail-list">
                                                <div class="cap-detail-row">
                                                    <dt>Product surface:</dt>
                                                    <dd>${escapeHTML(entry.productProvidedBy)}</dd>
                                                </div>
                                                <div class="cap-detail-row">
                                                    <dt>Required plan:</dt>
                                                    <dd>${escapeHTML(entry.requiredPlan)}</dd>
                                                </div>
                                                <div class="cap-detail-row">
                                                    <dt>Availability &amp; limits:</dt>
                                                    <dd>${escapeHTML(entry.availabilityAndLimitations)}</dd>
                                                </div>
                                                <div class="cap-detail-row cap-detail-source">
                                                    <dt>Official source:</dt>
                                                    <dd>${sourceLinkHTML} <span class="cap-verified-date">(Verified: ${escapeHTML(entry.lastVerifiedDate)})</span></dd>
                                                </div>
                                            </dl>
                                        </td>`;
            }).join('');

            return `
                                    <tr role="row" class="capability-row">
                                        <th role="rowheader" scope="row" class="capability-feature-cell">
                                            <div class="cap-feature-name">${escapeHTML(cap.featureName)}</div>
                                            <p class="cap-feature-desc">${escapeHTML(cap.whatItDoes)}</p>
                                        </th>${toolCellsHTML}
                                    </tr>`;
        }).join('');

        const toolHeadersHTML = toolObjects.map(tool =>
            `<th role="columnheader" scope="col" class="cap-col-tool">${escapeHTML(tool.canonicalName)}</th>`
        ).join('\n                                        ');

        return `
                        <details class="capability-category-group" id="cap-cat-${escapeHTML(cat.categoryId)}" data-category-id="${escapeHTML(cat.categoryId)}" open>
                            <summary class="capability-category-summary">
                                <span class="cap-cat-summary-main">
                                    <span class="cap-cat-title">${escapeHTML(cat.title)}</span>
                                    <span class="cap-cat-count">${catCaps.length} ${catCaps.length === 1 ? 'capability' : 'capabilities'}</span>
                                </span>
                                <span class="cap-cat-desc">${escapeHTML(cat.summary)}</span>
                                <span class="cap-chevron" aria-hidden="true"></span>
                            </summary>
                            <div class="capability-category-content">
                                <div class="table-responsive table-responsive-cards capability-table-wrapper">
                                    <table role="table" class="capability-explorer-table" style="width: 100%; border-collapse: collapse; text-align: left; ${labelVars};">
                                        <thead role="rowgroup">
                                            <tr role="row">
                                                <th role="columnheader" scope="col" class="cap-col-feature">Capability &amp; What It Does</th>
                                                ${toolHeadersHTML}
                                            </tr>
                                        </thead>
                                        <tbody role="rowgroup">${rowsHTML}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </details>`;
    }).join('\n');

    return `
            <section class="compare-section capability-explorer-section" id="capability-explorer" aria-labelledby="capability-explorer-heading" style="margin-bottom: 3rem;">
                <h2 id="capability-explorer-heading">Full Capability Explorer</h2>
                <p class="cap-explorer-intro">Need to check a specific workflow beyond the high-level summary? Expand the source-backed inventory below to inspect ${totalCapabilities} verified capabilities across ${totalCategories} categories, separating consumer app features, paid subscriptions, related CLI/browser tools, underlying models, business workspaces, and developer APIs.</p>
                <div class="cap-legend" aria-label="Capability availability state legend">
                    <span class="cap-legend-label">States used:</span>
                    <span class="cap-state-badge cap-state--available">Available</span>
                    <span class="cap-state-badge cap-state--limited">Limited</span>
                    <span class="cap-state-badge cap-state--not-offered">Not offered</span>
                    <span class="cap-state-badge cap-state--not-verified">Not verified</span>
                </div>
                <details class="capability-explorer-master" id="explore-all-capabilities">
                    <summary class="capability-explorer-master-summary">
                        <span class="cap-master-summary-text">Explore all capabilities</span>
                        <span class="cap-master-summary-meta">${totalCapabilities} verified capabilities across ${totalCategories} categories</span>
                        <span class="cap-chevron" aria-hidden="true"></span>
                    </summary>
                    <div class="capability-explorer-body">
                        <div class="capability-explorer-toolbar">
                            <div class="cap-filter-group" role="group" aria-label="Filter capabilities by category">
                                ${filterButtonsHTML}
                            </div>
                            <div class="cap-action-group" role="group" aria-label="Expand or collapse capability categories">
                                <button type="button" class="cap-action-btn" data-cap-action="expand-all">Expand all categories</button>
                                <button type="button" class="cap-action-btn" data-cap-action="collapse-all">Collapse all categories</button>
                            </div>
                        </div>
                        <div class="capability-categories-list">${categoriesHTML}
                        </div>
                        <p class="cap-explorer-disclaimer">${escapeHTML(inventory.scopeDisclaimer)}</p>
                    </div>
                </details>
            </section>
    `;
}
