document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('shortlist-grid');
    const emptyState = document.getElementById('shortlist-empty-state');
    const actionBox = document.getElementById('shortlist-actions');
    const clearBtn = document.getElementById('clear-shortlist-btn');
    const compareBtn = document.getElementById('compare-selected-btn');
    const compareCountMsg = document.getElementById('compare-count-msg');

    let allTools = [];
    let selectedForCompare = new Set();

    try {
        allTools = await window.loadTools();
    } catch (e) {
        console.error("Failed to load tools", e);
        grid.innerHTML = '<p>Failed to load tools data. Please try again later.</p>';
        return;
    }

    function render() {
        const savedIds = window.Shortlist.items;
        
        if (savedIds.length === 0) {
            grid.style.display = 'none';
            actionBox.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        actionBox.style.display = 'flex';
        grid.style.display = 'grid';
        grid.innerHTML = '';

        const fragment = document.createDocumentFragment();
        
        // Clean up stale IDs
        let staleIds = [];
        let validTools = [];
        
        savedIds.forEach(id => {
            const tool = allTools.find(t => t.id === id);
            if (tool) {
                validTools.push(tool);
            } else {
                staleIds.push(id);
            }
        });

        // Automatically remove IDs that don't exist in tools.json anymore
        staleIds.forEach(id => window.Shortlist.remove(id));

        if (validTools.length === 0) {
            grid.style.display = 'none';
            actionBox.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        validTools.forEach(tool => {
            fragment.appendChild(renderShortlistCard(tool));
        });

        grid.appendChild(fragment);
        updateCompareButton();
    }

    function renderShortlistCard(tool) {
        const article = document.createElement('article');
        article.className = 'tool-card shortlist-specific-card';
        article.style.position = 'relative';

        const isDiscontinued = tool.operationalStatus === 'discontinued' || tool.lifecycleStatus === 'discontinued';
        const statusBadge = isDiscontinued ? `<span class="badge badge-warning" style="margin-bottom: 0.5rem; display: inline-block;">Discontinued</span>` : '';
        const successorInfo = tool.successorToolId ? `<p style="font-size: 0.85rem; color: var(--color-orange); margin-bottom: 0.5rem;"><a href="/tool.html?id=${tool.successorToolId}" style="color: inherit; text-decoration: underline;">See current successor</a></p>` : '';
        
        // Content review subtle note
        const reviewNote = tool.contentReviewRequired ? `<span style="font-size: 0.75rem; color: var(--color-gray-400); display: block; margin-top: 0.5rem;">Pending editorial review</span>` : '';

        const isChecked = selectedForCompare.has(tool.id) ? 'checked' : '';

        article.innerHTML = `
            <div style="position: absolute; top: 1rem; right: 1rem; display: flex; align-items: center; gap: 0.5rem; z-index: 2;">
                <label style="display: flex; align-items: center; gap: 0.25rem; font-size: 0.85rem; cursor: pointer; background: var(--color-gray-800); padding: 0.25rem 0.5rem; border-radius: 4px; border: 1px solid var(--color-gray-700);">
                    <input type="checkbox" class="compare-checkbox" data-id="${tool.id}" ${isChecked}>
                    Compare
                </label>
            </div>
            
            <a href="/tool.html?id=${tool.id}" class="card-link-wrapper" style="display: block; text-decoration: none; color: inherit;">
                <div class="card-header">
                    ${statusBadge}
                    ${successorInfo}
                    <h3>${tool.name}</h3>
                    <span class="category-tag">${tool.category}</span>
                </div>
                
                <div class="card-body">
                    <p class="tool-description">${tool.description || 'No description available.'}</p>
                    ${reviewNote}
                    
                    <div class="meta-row" style="margin-top: 1rem; font-size: 0.9rem;">
                        <strong>Pricing:</strong> ${tool.pricingModel || tool.pricing_model || 'Unknown'}
                        ${tool.hasFreeTier || tool.has_free_tier ? ' <span style="color: var(--color-green);">(Free Tier)</span>' : ''}
                    </div>
                </div>
            </a>
            <div class="card-footer" style="margin-top: 1rem; display: flex; justify-content: space-between;">
                <button class="btn btn-secondary btn-sm remove-btn" data-id="${tool.id}">Remove</button>
            </div>
        `;

        // Bind events
        const removeBtn = article.querySelector('.remove-btn');
        removeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.Shortlist.remove(tool.id);
            selectedForCompare.delete(tool.id);
            render();
        });

        const checkbox = article.querySelector('.compare-checkbox');
        checkbox.addEventListener('click', (e) => e.stopPropagation()); // prevent card link click
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                if (selectedForCompare.size >= 4) {
                    alert("You can only compare up to 4 tools at a time.");
                    e.target.checked = false;
                    return;
                }
                selectedForCompare.add(tool.id);
                if (window.Analytics) Analytics.track('compare_selection_added', { toolId: tool.id });
            } else {
                selectedForCompare.delete(tool.id);
                if (window.Analytics) Analytics.track('compare_selection_removed', { toolId: tool.id });
            }
            updateCompareButton();
        });

        return article;
    }

    function updateCompareButton() {
        const count = selectedForCompare.size;
        compareBtn.disabled = count < 2;
        
        if (count === 0) {
            compareCountMsg.textContent = "Select 2–4 tools";
        } else if (count === 1) {
            compareCountMsg.textContent = "Select 1 to 3 more tools";
        } else {
            compareCountMsg.textContent = `${count} selected`;
        }
    }

    clearBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to remove all saved tools?")) {
            window.Shortlist.clear();
            selectedForCompare.clear();
            render();
        }
    });

    compareBtn.addEventListener('click', () => {
        if (selectedForCompare.size >= 2 && selectedForCompare.size <= 4) {
            const ids = Array.from(selectedForCompare).join(',');
            if (window.Analytics) Analytics.track('compare_started', { tools: ids });
            window.location.href = `/compare/?tools=${ids}`; // Using static route style
        }
    });

    // Listen for cross-tab updates to refresh this page
    window.addEventListener('shortlist_updated', () => {
        // Sync selectedForCompare (remove if they were deleted elsewhere)
        const currentSaved = new Set(window.Shortlist.items);
        for (let id of selectedForCompare) {
            if (!currentSaved.has(id)) {
                selectedForCompare.delete(id);
            }
        }
        render();
    });

    // Analytics Page View
    if (window.Analytics) Analytics.track('shortlist_opened', {});

    render();
});
