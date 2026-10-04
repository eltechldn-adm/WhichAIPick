export function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function checkIdentical(values) {
    if (values.length <= 1) return true;
    const first = values[0];
    for (let i = 1; i < values.length; i++) {
        if (Array.isArray(first)) {
            if (!Array.isArray(values[i])) return false;
            const set1 = [...first].sort().join(',');
            const set2 = [...values[i]].sort().join(',');
            if (set1 !== set2) return false;
        } else {
            if (first !== values[i]) return false;
        }
    }
    return true;
}

export function renderBoolean(val) {
    if (val === true) return '<span class="val-yes">✅ Yes</span>';
    if (val === false) return '<span class="val-no">❌ No</span>';
    return '<span class="unknown-val">❓ Not confirmed</span>';
}

export function renderExperienceLevel(val) {
    if (val === null || val === undefined || val === '') return '<span class="unknown-val">Not available</span>';
    if (val === 'all_levels') return 'All experience levels';
    return escapeHTML(val).charAt(0).toUpperCase() + escapeHTML(val).slice(1).replace(/_/g, ' ');
}

export function renderList(items) {
    if (!items || !Array.isArray(items) || items.length === 0) return '<span class="unknown-val">No structured data available</span>';
    return `<ul class="val-list">${items.map(i => `<li>${escapeHTML(i)}</li>`).join('')}</ul>`;
}

export function renderFactorRow(factorName, tools, extractFn, renderFn) {
    const rawValues = tools.map(t => extractFn(t));
    const isIdentical = checkIdentical(rawValues);

    return `
        <tr class="${isIdentical ? 'row-identical' : ''}">
            <th scope="row" class="compare-factor-col">${factorName}</th>
            ${tools.map((tool, index) => {
                const rawVal = rawValues[index];
                return `<td>${renderFn(rawVal, tool)}</td>`;
            }).join('')}
        </tr>
    `;
}

export function renderCompatibilityWarning(tools) {
    if (tools.length < 2) return '';

    let hasMismatchedIntents = false;
    let categoryOverlap = true;

    const firstIntents = tools[0].finderIntentIds || [];
    const firstCategory = tools[0].primaryCategory;

    for (let i = 1; i < tools.length; i++) {
        const currentIntents = tools[i].finderIntentIds || [];
        const currentCategory = tools[i].primaryCategory;

        if (firstCategory !== currentCategory) {
            categoryOverlap = false;
        }

        const intersection = firstIntents.filter(int => currentIntents.includes(int));
        if (intersection.length === 0 && firstIntents.length > 0 && currentIntents.length > 0) {
            hasMismatchedIntents = true;
        }
    }

    if (!categoryOverlap || hasMismatchedIntents) {
        return `
            <div class="compatibility-warning" role="alert">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span><strong>Different tool types:</strong> These tools serve different primary functions, so some comparison rows may not be directly equivalent.</span>
            </div>
        `;
    }
    return '';
}

export function renderComparisonTableRows(tools) {
    return `
        <!-- Overview Section -->
        <tr class="compare-section-header">
            <td colspan="${tools.length + 1}">Overview</td>
        </tr>
        ${renderFactorRow('Category', tools, t => t.primaryCategory, val => val ? `<span class="compare-tag">${escapeHTML(val)}</span>` : '<span class="unknown-val">Not available</span>')}
        ${renderFactorRow('Experience level', tools, t => t.experienceLevel, renderExperienceLevel)}
        ${renderFactorRow('Evidence reviewed', tools, t => t.evidenceReviewedAt, val => val ? `<span class="evidence-date">${escapeHTML(val)}</span>` : '<span class="unknown-val">Evidence review date not available</span>')}

        <!-- Best Fit Section -->
        <tr class="compare-section-header">
            <td colspan="${tools.length + 1}">Best fit</td>
        </tr>
        ${renderFactorRow('Best for', tools, t => t.bestFor, val => renderList(val))}
        ${renderFactorRow('Not ideal for', tools, t => t.notIdealFor, val => renderList(val))}
        ${renderFactorRow('Primary use cases', tools, t => t.primaryUseCases, val => renderList(val))}

        <!-- Pricing Section -->
        <tr class="compare-section-header">
            <td colspan="${tools.length + 1}">Pricing</td>
        </tr>
        ${renderFactorRow('Pricing model', tools, t => t.pricingModel, val => escapeHTML(val) || '<span class="unknown-val">Not confirmed</span>')}
        ${renderFactorRow('Free tier', tools, t => t.hasFreeTier, renderBoolean)}
        ${renderFactorRow('Free trial', tools, t => t.hasFreeTrial, renderBoolean)}
        ${renderFactorRow('Starting price', tools, t => t.startingPrice, (val, t) => {
            if (val === null) return '<span class="unknown-val">Pricing not confirmed</span>';
            const currencyStr = t.priceCurrency ? escapeHTML(t.priceCurrency) + ' ' : '';
            return `<strong>${currencyStr}${val}</strong>`;
        })}

        <!-- Technical Section -->
        <tr class="compare-section-header">
            <td colspan="${tools.length + 1}">Availability & Technical</td>
        </tr>
        ${renderFactorRow('Platforms', tools, t => t.platforms, val => (val && val.length > 0) ? val.map(p => `<span class="compare-tag">${escapeHTML(p)}</span>`).join('') : '<span class="unknown-val">No structured platform data</span>')}
        ${renderFactorRow('API available', tools, t => t.apiAvailable, renderBoolean)}
        ${renderFactorRow('Open source', tools, t => t.openSource, renderBoolean)}
        ${renderFactorRow('Self-hosted', tools, t => t.selfHosted, renderBoolean)}
    `;
}
