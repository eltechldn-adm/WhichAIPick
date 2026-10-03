/**
 * compare-engine.js
 *
 * Handles the dynamic comparison system at /compare/.
 * Reads from URL hash (#tools=id1,id2) and renders the comparison table
 * using the local data/comparison-index.json catalog.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const tableContainer = document.getElementById('compare-table-container');
    const emptyState = document.getElementById('compare-empty-state');
    const staticLinks = document.getElementById('compare-static-links');
    const selectorModal = document.getElementById('compare-selector-modal');
    const selectorInput = document.getElementById('compare-selector-input');
    const selectorResults = document.getElementById('compare-selector-results');
    const copyLinkBtn = document.getElementById('copy-compare-link');
    const saveCompareBtn = document.getElementById('save-compare-btn');

    let allTools = [];
    let currentIds = [];
    let showDifferencesOnly = false;

    // Check if we are on the compare page
    if (!tableContainer || !emptyState) return;

    try {
        const response = await fetch('/data/comparison-index.json');
        if (!response.ok) throw new Error('Network response was not ok');
        allTools = await response.json();
    } catch (e) {
        console.error("Failed to load comparison index.", e);
        tableContainer.innerHTML = '<p>Failed to load comparison data. Please try again later.</p>';
        return;
    }

    // Helper to safely escape HTML
    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    if (saveCompareBtn && window.UserState) {
        saveCompareBtn.addEventListener('click', () => {
            if (currentIds.length < 2) return;
            const isSaved = window.UserState.isComparisonSaved(currentIds);
            if (isSaved) {
                window.UserState.removeComparison(currentIds);
            } else {
                window.UserState.saveComparison(currentIds);
            }
            updateSaveCompareBtnState();
        });
    }

    function updateSaveCompareBtnState() {
        if (!saveCompareBtn || !window.UserState || currentIds.length < 2) return;
        const isSaved = window.UserState.isComparisonSaved(currentIds);
        const textSpan = saveCompareBtn.querySelector('.save-compare-text');
        if (textSpan) {
            textSpan.textContent = isSaved ? 'Saved to My Tools' : 'Save Comparison';
        }
        if (isSaved) {
            saveCompareBtn.innerHTML = `<svg class="compare-action-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg><span class="save-compare-text">Saved to My Tools</span>`;
            saveCompareBtn.classList.add('saved');
        } else {
            saveCompareBtn.innerHTML = `<svg class="compare-action-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg><span class="save-compare-text">Save Comparison</span>`;
            saveCompareBtn.classList.remove('saved');
        }
    }

    // Initialize from URL
    function initFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        let rawIds = [];

        // Migrate legacy ?tools= to #tools=
        if (urlParams.has('tools')) {
            rawIds = urlParams.get('tools').split(',').map(id => id.trim()).filter(Boolean);

            // Validate, deduplicate, limit to 4
            const validIds = new Set();
            rawIds.forEach(id => {
                if (allTools.find(t => t.id === id) && validIds.size < 4) {
                    validIds.add(id);
                }
            });
            currentIds = Array.from(validIds);

            if (currentIds.length > 0) {
                // Migrate to hash without reload
                window.history.replaceState({ tools: currentIds }, '', `/compare#tools=${currentIds.join(',')}`);
            } else {
                window.history.replaceState({ tools: [] }, '', '/compare');
            }
        } else if (window.location.hash.startsWith('#tools=')) {
            rawIds = window.location.hash.replace('#tools=', '').split(',').map(id => id.trim()).filter(Boolean);

            // Validate, deduplicate, limit to 4
            const validIds = new Set();
            rawIds.forEach(id => {
                if (allTools.find(t => t.id === id) && validIds.size < 4) {
                    validIds.add(id);
                }
            });
            currentIds = Array.from(validIds);
        } else {
            currentIds = [];
        }

        render();
    }

    function updateURL() {
        if (currentIds.length > 0) {
            const newUrl = `/compare#tools=${currentIds.join(',')}`;
            window.history.pushState({ tools: currentIds }, '', newUrl);
        } else {
            window.history.pushState({ tools: [] }, '', '/compare');
        }
    }

    function render() {
        if (currentIds.length < 2) {
            tableContainer.style.display = 'none';
            if (copyLinkBtn) copyLinkBtn.style.display = 'none';
            if (saveCompareBtn) saveCompareBtn.style.display = 'none';
            emptyState.style.display = 'block';
            if (currentIds.length === 0 && staticLinks) {
                staticLinks.style.display = 'block';
            } else if (staticLinks) {
                staticLinks.style.display = 'none';
            }

            renderEmptyStateContent();
        } else {
            emptyState.style.display = 'none';
            if (staticLinks) staticLinks.style.display = 'none';
            tableContainer.style.display = 'block';
            if (copyLinkBtn) copyLinkBtn.style.display = 'flex';

            if (saveCompareBtn && window.UserState) {
                saveCompareBtn.style.display = 'flex';
                updateSaveCompareBtnState();
            }

            renderComparisonTable();
        }
    }

    function renderEmptyStateContent() {
        if (currentIds.length === 1) {
            const tool = allTools.find(t => t.id === currentIds[0]);
            emptyState.innerHTML = `
                <h1>Compare AI Tools</h1>
                <div class="content-narrow">
                    <p>You have selected <strong>${escapeHTML(tool.canonicalName)}</strong>. Add at least one more tool to start comparing.</p>
                    <button class="btn btn-primary" onclick="window.CompareEngine.openSelector()">Add another tool</button>
                    <div style="margin-top: 1rem;">
                        <button class="btn btn-secondary btn-sm" onclick="window.CompareEngine.removeTool('${tool.id}')">Remove ${escapeHTML(tool.canonicalName)}</button>
                    </div>
                </div>
            `;
        } else {
            emptyState.innerHTML = `
                <h1>Compare AI Tools</h1>
                <div class="content-narrow">
                    <p>Choose 2–4 tools to compare their pricing, strengths, limitations and best-fit use cases side by side.</p>
                    <button class="btn btn-primary" onclick="window.CompareEngine.openSelector()">Select tools to compare</button>
                </div>
            `;
        }
    }

    // Checking if values are identical for differences-only mode
    function checkIdentical(values) {
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

    function renderComparisonTable() {
        const tools = currentIds.map(id => allTools.find(t => t.id === id));

        let html = `
            <div class="differences-toggle-container">
                <label>
                    <input type="checkbox" id="toggle-differences" ${showDifferencesOnly ? 'checked' : ''}>
                    Show differences only
                </label>
            </div>
            ${renderCompatibilityWarning(tools)}
            <div class="compare-table-wrapper" role="region" aria-label="Comparison Table" tabindex="0">
                <table class="compare-table ${showDifferencesOnly ? 'hide-identical' : ''}" style="--tool-count: ${tools.length};">
                    <thead>
                        <tr>
                            <th scope="col" class="compare-factor-col"><span class="sr-only">Factor</span></th>
                            ${tools.map(tool => renderToolHeader(tool)).join('')}
                        </tr>
                    </thead>
                    <tbody>
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
                    </tbody>
                </table>
            </div>
        `;

        // Render Best Fit Engine summary below table
        html += renderBestFitSummary(tools);

        tableContainer.innerHTML = html;

        const toggle = document.getElementById('toggle-differences');
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                showDifferencesOnly = e.target.checked;
                const table = tableContainer.querySelector('.compare-table');
                if (table) {
                    if (showDifferencesOnly) {
                        table.classList.add('hide-identical');
                    } else {
                        table.classList.remove('hide-identical');
                    }
                }
            });
        }

        if (window.Analytics) Analytics.track('comparison_opened', { tools: currentIds.join(',') });
    }

    function renderToolHeader(tool) {
        const isDiscontinued = tool.operationalStatus === 'discontinued' || tool.lifecycleStatus === 'discontinued';
        const successorInfo = tool.successorToolId ?
            `<div style="font-size: 0.8rem; color: var(--color-orange); margin-bottom: 0.25rem;">Successor: <a href="/compare#tools=${escapeHTML(tool.successorToolId)}" style="color: inherit; text-decoration: underline;">${escapeHTML(tool.successorToolId)}</a></div>` : '';

        return `
            <th scope="col" class="compare-tool-col">
                <div class="compare-tool-header">
                    ${successorInfo}
                    <h3 style="${isDiscontinued ? 'text-decoration: line-through; color: var(--color-gray-400);' : ''}">
                        <a href="/tools/${escapeHTML(tool.id)}/" style="color: inherit; text-decoration: none;">${escapeHTML(tool.canonicalName)}</a>
                    </h3>
                    ${tool.pricingNeedsReview ? '<span class="pricing-warning">Pricing may need rechecking</span>' : ''}
                    <div class="compare-header-actions">
                        <button class="btn btn-secondary btn-sm" onclick="window.CompareEngine.removeTool('${escapeHTML(tool.id)}')">Remove</button>
                        <button class="btn btn-secondary btn-sm" onclick="window.CompareEngine.openSelector('${escapeHTML(tool.id)}')">Replace</button>
                    </div>
                </div>
            </th>
        `;
    }

    function renderFactorRow(factorName, tools, extractFn, renderFn) {
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

    function renderBoolean(val) {
        if (val === true) return '<span class="val-yes">✅ Yes</span>';
        if (val === false) return '<span class="val-no">❌ No</span>';
        return '<span class="unknown-val">❓ Not confirmed</span>';
    }

    function renderExperienceLevel(val) {
        if (val === null || val === undefined || val === '') return '<span class="unknown-val">Not available</span>';
        if (val === 'all_levels') return 'All experience levels';
        // Title case it
        return escapeHTML(val).charAt(0).toUpperCase() + escapeHTML(val).slice(1).replace(/_/g, ' ');
    }

    function renderList(items) {
        if (!items || !Array.isArray(items) || items.length === 0) return '<span class="unknown-val">No structured data available</span>';
        return `<ul class="val-list">${items.map(i => `<li>${escapeHTML(i)}</li>`).join('')}</ul>`;
    }

    function renderCompatibilityWarning(tools) {
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

            // Check intersection of intents
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

    function renderBestFitSummary(tools) {
        let summaryHtml = '<div class="best-fit-summary">';
        summaryHtml += '<h3>Best-fit signals</h3>';
        summaryHtml += '<ul class="best-fit-list">';

        tools.forEach(tool => {
            let signals = [];

            if (tool.bestFor && tool.bestFor.length > 0) {
                signals.push(`Best For: ${escapeHTML(tool.bestFor[0])}`);
            }
            if (tool.primaryUseCases && tool.primaryUseCases.length > 0) {
                signals.push(`Primary Use Cases: ${escapeHTML(tool.primaryUseCases[0])}`);
            }
            if (tool.hasFreeTier === true) {
                signals.push(`Free Tier: Confirmed`);
            }

            summaryHtml += `
                <li class="best-fit-item">
                    <strong>${escapeHTML(tool.canonicalName)}</strong>
                    <div class="best-fit-item-why">
                        • ${signals.join('<br>• ')}
                    </div>
                </li>
            `;
        });

        summaryHtml += '</ul>';
        summaryHtml += '</div>';

        return summaryHtml;
    }

    // Modal UI logic
    let replaceTargetId = null;
    let focusableElements = [];
    let firstFocusableElement = null;
    let lastFocusableElement = null;

    function updateModalFocusables() {
        const focusableString = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]';
        focusableElements = Array.from(selectorModal.querySelectorAll(focusableString));
        firstFocusableElement = focusableElements[0];
        lastFocusableElement = focusableElements[focusableElements.length - 1];
    }

    function trapFocus(e) {
        const isTabPressed = e.key === 'Tab' || e.keyCode === 9;
        const isEscPressed = e.key === 'Escape' || e.keyCode === 27;

        if (isEscPressed) {
            closeSelector();
            return;
        }

        if (!isTabPressed) return;

        if (e.shiftKey) {
            if (document.activeElement === firstFocusableElement) {
                lastFocusableElement.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastFocusableElement) {
                firstFocusableElement.focus();
                e.preventDefault();
            }
        }
    }

    function openSelector(replaceId = null) {
        if (!replaceId && currentIds.length >= 4) {
            showToast("You can compare up to 4 tools at once.");
            return;
        }
        replaceTargetId = replaceId;
        selectorInput.value = '';
        renderSearchResults('');
        selectorModal.style.display = 'flex';
        updateModalFocusables();
        selectorInput.focus();

        selectorModal.addEventListener('keydown', trapFocus);
    }

    function closeSelector() {
        selectorModal.style.display = 'none';
        replaceTargetId = null;
        selectorModal.removeEventListener('keydown', trapFocus);
    }

    function renderSearchResults(query) {
        const q = query.toLowerCase().trim();
        let results = allTools;

        if (q) {
            results = allTools.filter(t => {
                const nameMatch = t.canonicalName.toLowerCase().includes(q);
                const aliasMatch = t.aliases && t.aliases.some(a => a.toLowerCase().includes(q));
                const catMatch = t.primaryCategory && t.primaryCategory.toLowerCase().includes(q);
                const useCaseMatch = t.primaryUseCases && t.primaryUseCases.some(u => u.toLowerCase().includes(q));
                return nameMatch || aliasMatch || catMatch || useCaseMatch;
            });

            // Simple relevance sort: exact name > name prefix > name contains > alias > category/usecase
            results.sort((a, b) => {
                const aName = a.canonicalName.toLowerCase();
                const bName = b.canonicalName.toLowerCase();
                if (aName === q && bName !== q) return -1;
                if (bName === q && aName !== q) return 1;
                if (aName.startsWith(q) && !bName.startsWith(q)) return -1;
                if (bName.startsWith(q) && !aName.startsWith(q)) return 1;

                const aContains = aName.includes(q);
                const bContains = bName.includes(q);
                if (aContains && !bContains) return -1;
                if (bContains && !aContains) return 1;

                return 0;
            });
        }

        // Filter out already selected tools
        results = results.filter(t => !currentIds.includes(t.id) && t.id !== replaceTargetId);

        // Show top 20
        results = results.slice(0, 20);

        if (results.length === 0) {
            selectorResults.innerHTML = '<p style="padding: 1rem; text-align: center; color: var(--color-gray-400);">No tools found matching your search.</p>';
            updateModalFocusables();
            return;
        }

        selectorResults.innerHTML = results.map(t => {
            const useCases = (t.primaryUseCases && t.primaryUseCases.length > 0) ? t.primaryUseCases[0] : '';
            return `
                <button class="selector-result-btn" onclick="window.CompareEngine.selectTool('${escapeHTML(t.id)}')">
                    <div class="selector-result-name">${escapeHTML(t.canonicalName)}</div>
                    <div class="selector-result-meta">${escapeHTML(t.primaryCategory)}${useCases ? ` • ${escapeHTML(useCases)}` : ''}</div>
                </button>
            `;
        }).join('');

        updateModalFocusables();
    }

    selectorInput.addEventListener('input', (e) => {
        renderSearchResults(e.target.value);
    });

    // Close modal on outside click
    selectorModal.addEventListener('click', (e) => {
        if (e.target === selectorModal) closeSelector();
    });

    // API Export for global access
    window.CompareEngine = {
        addTool: (id) => {
            if (currentIds.length >= 4) {
                showToast("You can compare up to 4 tools at once.");
                return;
            }
            if (!currentIds.includes(id)) {
                currentIds.push(id);
                updateURL();
                render();
                if (window.Analytics) Analytics.track('comparison_tool_added', { toolId: id });
            }
        },
        removeTool: (id) => {
            currentIds = currentIds.filter(tid => tid !== id);
            updateURL();
            render();
            if (window.Analytics) Analytics.track('comparison_tool_removed', { toolId: id });
        },
        replaceTool: (oldId, newId) => {
            const idx = currentIds.indexOf(oldId);
            if (idx > -1) {
                currentIds[idx] = newId;
            } else if (currentIds.length < 4) {
                currentIds.push(newId);
            }
            updateURL();
            render();
            if (window.Analytics) Analytics.track('comparison_tool_replaced', { oldId, newId });
        },
        selectTool: (id) => {
            if (replaceTargetId) {
                window.CompareEngine.replaceTool(replaceTargetId, id);
            } else {
                window.CompareEngine.addTool(id);
            }
            closeSelector();
        },
        openSelector,
        closeSelector
    };

    // Handle Copy Link
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(window.location.href);
                const originalText = copyLinkBtn.innerHTML;
                copyLinkBtn.innerHTML = 'Link Copied!';
                if (window.Analytics) Analytics.track('comparison_link_copied', { tools: currentIds.join(',') });
                setTimeout(() => {
                    copyLinkBtn.innerHTML = originalText;
                }, 2000);
            } catch (err) {
                showToast("Unable to copy to clipboard. Please copy the URL from your browser address bar.");
            }
        });
    }

    // Toast helper
    function showToast(message) {
        if (window.Shortlist && typeof window.Shortlist.showToast === 'function') {
            window.Shortlist.showToast(message);
        } else {
            alert(message); // Fallback
        }
    }

    // Handle browser Back/Forward navigation
    window.addEventListener('hashchange', () => {
        initFromURL();
    });

    window.addEventListener('popstate', (e) => {
        if (!window.location.hash) {
            initFromURL();
        }
    });

    // Boot
    initFromURL();
});
