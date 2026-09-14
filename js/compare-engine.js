/**
 * compare-engine.js
 * 
 * Handles the dynamic comparison system at /compare/.
 * Reads from URL parameters (?tools=id1,id2) and renders the comparison table
 * using the local data/tools.json catalog.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const tableContainer = document.getElementById('compare-table-container');
    const emptyState = document.getElementById('compare-empty-state');
    const staticLinks = document.getElementById('compare-static-links');
    const selectorModal = document.getElementById('compare-selector-modal');
    const selectorInput = document.getElementById('compare-selector-input');
    const selectorResults = document.getElementById('compare-selector-results');
    const copyLinkBtn = document.getElementById('copy-compare-link');

    let allTools = [];
    let currentIds = [];

    // Check if we are on the compare page
    if (!tableContainer || !emptyState) return;

    try {
        allTools = await window.loadTools();
    } catch (e) {
        console.error("Failed to load tools catalog for comparison.", e);
        tableContainer.innerHTML = '<p>Failed to load comparison data. Please try again later.</p>';
        return;
    }

    // Initialize from URL
    function initFromURL() {
        const params = new URLSearchParams(window.location.search);
        const toolsParam = params.get('tools');
        if (toolsParam) {
            const rawIds = toolsParam.split(',').map(id => id.trim()).filter(Boolean);
            
            // Validate, deduplicate, and limit to 4
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
            const newUrl = `/compare/?tools=${currentIds.join(',')}`;
            window.history.pushState({ tools: currentIds }, '', newUrl);
        } else {
            window.history.pushState({ tools: [] }, '', '/compare/');
        }
    }

    function render() {
        if (currentIds.length < 2) {
            // Empty state (0 or 1 tool)
            tableContainer.style.display = 'none';
            if (copyLinkBtn) copyLinkBtn.style.display = 'none';
            emptyState.style.display = 'block';
            if (currentIds.length === 0 && staticLinks) {
                staticLinks.style.display = 'block';
            } else if (staticLinks) {
                staticLinks.style.display = 'none';
            }
            
            renderEmptyStateContent();
        } else {
            // Comparison state (2 to 4 tools)
            emptyState.style.display = 'none';
            if (staticLinks) staticLinks.style.display = 'none';
            tableContainer.style.display = 'block';
            if (copyLinkBtn) copyLinkBtn.style.display = 'inline-flex';
            
            renderComparisonTable();
        }
    }

    function renderEmptyStateContent() {
        if (currentIds.length === 1) {
            const tool = allTools.find(t => t.id === currentIds[0]);
            emptyState.innerHTML = `
                <h2>Compare AI Tools</h2>
                <p>You have selected <strong>${tool.name}</strong>. Add at least one more tool to start comparing.</p>
                <button class="btn btn-primary" onclick="window.CompareEngine.openSelector()">Add another tool</button>
                <div style="margin-top: 1rem;">
                    <button class="btn btn-secondary btn-sm" onclick="window.CompareEngine.removeTool('${tool.id}')">Remove ${tool.name}</button>
                </div>
            `;
        } else {
            emptyState.innerHTML = `
                <h2>Compare AI Tools</h2>
                <p>Choose 2–4 tools to compare their pricing, strengths, limitations and best-fit use cases side by side.</p>
                <button class="btn btn-primary" onclick="window.CompareEngine.openSelector()">Select tools to compare</button>
            `;
        }
    }

    function renderComparisonTable() {
        const tools = currentIds.map(id => allTools.find(t => t.id === id));
        
        let html = `
            <div class="compare-table-wrapper">
                <table class="compare-table">
                    <thead>
                        <tr>
                            <th class="compare-factor-col">Factor</th>
                            ${tools.map(tool => renderToolHeader(tool)).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${renderFactorRow('Category', tools, t => `<span class="category-tag">${t.category || 'Uncategorized'}</span>`)}
                        ${renderFactorRow('Best For', tools, t => t.bestFor ? renderList(t.bestFor) : '<span class="unknown-val">Information unavailable</span>')}
                        ${renderFactorRow('Primary Use Cases', tools, t => t.primaryUseCases ? t.primaryUseCases.join(', ') : '<span class="unknown-val">Unknown</span>')}
                        ${renderFactorRow('Pricing Model', tools, t => t.pricingModel || t.pricing_model || '<span class="unknown-val">Not confirmed</span>')}
                        ${renderFactorRow('Free Tier', tools, t => {
                            const hasFree = (t.hasFreeTier === true || t.has_free_tier === true || t.hasFreeTier === 'Yes');
                            return hasFree ? '<span style="color: var(--color-green); font-weight: 500;">Yes</span>' : 'No';
                        })}
                        ${renderFactorRow('Strengths', tools, t => t.strengths ? renderList(t.strengths) : (t.pros ? renderList(t.pros) : '<span class="unknown-val">Not confirmed</span>'))}
                        ${renderFactorRow('Limitations', tools, t => t.limitations ? renderList(t.limitations) : (t.notIdealFor ? renderList(t.notIdealFor) : (t.cons ? renderList(t.cons) : '<span class="unknown-val">Not confirmed</span>')))}
                        ${renderFactorRow('Status', tools, t => {
                            const isDiscontinued = t.operationalStatus === 'discontinued' || t.lifecycleStatus === 'discontinued';
                            return isDiscontinued ? '<span class="badge badge-warning">Discontinued</span>' : '<span class="badge badge-success">Active</span>';
                        })}
                        ${renderFactorRow('Pricing Verified', tools, t => {
                            if (t.pricingNeedsReview) return '<span style="font-size: 0.85rem; color: var(--color-gray-400);">Pricing information may need rechecking.</span>';
                            if (t.lastPricingCheck) return `<span style="font-size: 0.85rem; color: var(--color-gray-300);">${t.lastPricingCheck}</span>`;
                            return '<span class="unknown-val" style="font-size: 0.85rem;">Not verified recently</span>';
                        })}
                    </tbody>
                </table>
            </div>
        `;
        
        // Render Best Fit Engine summary below table
        html += renderBestFitSummary(tools);
        
        tableContainer.innerHTML = html;
        
        if (window.Analytics) Analytics.track('comparison_opened', { tools: currentIds.join(',') });
    }

    function renderToolHeader(tool) {
        const isDiscontinued = tool.operationalStatus === 'discontinued' || tool.lifecycleStatus === 'discontinued';
        const successorInfo = tool.successorToolId ? 
            `<div style="font-size: 0.8rem; color: var(--color-orange); margin-bottom: 0.25rem;">Successor: <a href="/compare/?tools=${tool.successorToolId}" style="color: inherit; text-decoration: underline;">${tool.successorToolId}</a></div>` : '';
        
        return `
            <th class="compare-tool-col">
                <div class="compare-tool-header">
                    ${successorInfo}
                    <h3 style="${isDiscontinued ? 'text-decoration: line-through; color: var(--color-gray-400);' : ''}">
                        <a href="/tool.html?id=${tool.id}" style="color: inherit; text-decoration: none;">${tool.name}</a>
                    </h3>
                    <div class="compare-header-actions" style="margin-top: 0.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button class="btn btn-secondary btn-sm" onclick="window.CompareEngine.removeTool('${tool.id}')">Remove</button>
                        <button class="btn btn-secondary btn-sm" onclick="window.CompareEngine.openSelector('${tool.id}')">Replace</button>
                    </div>
                </div>
            </th>
        `;
    }

    function renderFactorRow(factorName, tools, contentFn) {
        // Hide row if all tools are unknown for this factor (unless it's a core factor like Pricing Model)
        const isOptional = factorName === 'Pricing Verified';
        const allUnknown = tools.every(t => {
            const content = contentFn(t);
            return content.includes('unknown-val');
        });
        
        if (isOptional && allUnknown) return '';
        
        return `
            <tr>
                <td class="compare-factor-col"><strong>${factorName}</strong></td>
                ${tools.map(tool => `<td class="compare-data-col">${contentFn(tool)}</td>`).join('')}
            </tr>
        `;
    }

    function renderList(items) {
        if (!items || !Array.isArray(items) || items.length === 0) return '';
        return `<ul style="margin-left: 1.25rem; margin-bottom: 0;">${items.map(i => `<li style="margin-bottom: 0.25rem;">${i}</li>`).join('')}</ul>`;
    }

    function renderBestFitSummary(tools) {
        let summaryHtml = '<div class="best-fit-summary" style="margin-top: 2rem; padding: 1.5rem; background: var(--color-gray-800); border-radius: 8px; border: 1px solid var(--color-gray-700);">';
        summaryHtml += '<h3 style="margin-top: 0; color: var(--c-accent); margin-bottom: 1rem;">Comparison Summary</h3>';
        
        // Generate rule-based insights
        let insights = [];
        
        tools.forEach(tool => {
            let reasons = [];
            let fitStatement = `${tool.name} may suit you better if `;
            
            if (tool.bestFor && tool.bestFor.length > 0) {
                fitStatement += `you need a tool focused on ${tool.bestFor[0].toLowerCase()}.`;
                reasons.push(`Its primary focus is: ${tool.bestFor[0]}.`);
            } else if (tool.primaryUseCases && tool.primaryUseCases.length > 0) {
                fitStatement += `your workflow involves ${tool.primaryUseCases[0].toLowerCase()}.`;
                reasons.push(`It is heavily designed around ${tool.primaryUseCases[0]}.`);
            } else {
                fitStatement += `you are looking for a reliable ${tool.category} solution.`;
                reasons.push(`It operates in the ${tool.category} category.`);
            }
            
            const hasFree = (tool.hasFreeTier === true || tool.has_free_tier === true || tool.hasFreeTier === 'Yes');
            if (hasFree) {
                reasons.push(`It offers a free tier to get started.`);
            }
            
            insights.push({ toolName: tool.name, statement: fitStatement, reasons });
        });
        
        summaryHtml += '<ul style="list-style: none; padding: 0;">';
        insights.forEach(insight => {
            summaryHtml += `
                <li style="margin-bottom: 1.5rem;">
                    <strong>${insight.statement}</strong>
                    <div style="font-size: 0.9rem; color: var(--color-gray-300); margin-top: 0.25rem;">
                        <em>Why:</em> ${insight.reasons.join(' ')}
                    </div>
                </li>
            `;
        });
        summaryHtml += '</ul>';
        
        summaryHtml += '<p style="margin-bottom: 0; font-size: 0.85rem; color: var(--color-gray-400);"><em>Note: There isn\'t a single winner here — these tools serve different workflows. Based on existing WhichAIPick research.</em></p>';
        summaryHtml += '</div>';
        
        return summaryHtml;
    }

    // Modal UI logic
    let replaceTargetId = null;
    
    function openSelector(replaceId = null) {
        if (!replaceId && currentIds.length >= 4) {
            showToast("You can compare up to 4 tools at once.");
            return;
        }
        replaceTargetId = replaceId;
        selectorInput.value = '';
        renderSearchResults('');
        selectorModal.style.display = 'flex';
        selectorInput.focus();
    }
    
    function closeSelector() {
        selectorModal.style.display = 'none';
        replaceTargetId = null;
    }
    
    function renderSearchResults(query) {
        const q = query.toLowerCase().trim();
        let results = allTools;
        
        if (q) {
            results = allTools.filter(t => {
                const nameMatch = t.name.toLowerCase().includes(q);
                const prevMatch = t.previousName && t.previousName.toLowerCase().includes(q);
                const aliasMatch = t.aliases && t.aliases.some(a => a.toLowerCase().includes(q));
                return nameMatch || prevMatch || aliasMatch;
            });
        }
        
        // Filter out already selected tools
        results = results.filter(t => !currentIds.includes(t.id) && t.id !== replaceTargetId);
        
        // Sort active tools first, discontinued at bottom
        results.sort((a, b) => {
            const aDis = (a.operationalStatus === 'discontinued' || a.lifecycleStatus === 'discontinued') ? 1 : 0;
            const bDis = (b.operationalStatus === 'discontinued' || b.lifecycleStatus === 'discontinued') ? 1 : 0;
            return aDis - bDis;
        });
        
        // Show top 20
        results = results.slice(0, 20);
        
        if (results.length === 0) {
            selectorResults.innerHTML = '<p style="padding: 1rem; text-align: center; color: var(--color-gray-400);">No tools found matching your search.</p>';
            return;
        }
        
        selectorResults.innerHTML = results.map(t => {
            const isDiscontinued = t.operationalStatus === 'discontinued' || t.lifecycleStatus === 'discontinued';
            const badge = isDiscontinued ? ' <span class="badge badge-warning" style="font-size: 0.7rem;">Discontinued</span>' : '';
            return `
                <button class="selector-result-btn" onclick="window.CompareEngine.selectTool('${t.id}')">
                    <span style="font-weight: 500;">${t.name}</span>${badge}
                    <span style="display: block; font-size: 0.8rem; color: var(--color-gray-400);">${t.category}</span>
                </button>
            `;
        }).join('');
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
    window.addEventListener('popstate', (e) => {
        initFromURL();
    });

    // Boot
    initFromURL();
});
