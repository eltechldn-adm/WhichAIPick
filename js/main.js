// WhichAIPick - Main Data Loader
// Phase 1: Minimal functional wiring only

let toolsData = null;
let isLoading = false;
let loadError = null;

/**
 * Extract domain from URL
 */
function getDomain(url) {
    if (!url) return 'N/A';
    try {
        const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
        return urlObj.hostname.replace('www.', '');
    } catch {
        return 'N/A';
    }
}

/**
 * Load tools data from JSON
 */
async function loadTools() {
    if (toolsData) return toolsData;
    if (isLoading) {
        // Wait for existing load
        while (isLoading) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return toolsData;
    }

    isLoading = true;
    try {
        const response = await fetch('/data/tools.json?v=1.7');
        if (!response.ok) {
            throw new Error(`Failed to load tools data: ${response.status}`);
        }
        toolsData = await response.json();
        console.log(`✅ Loaded ${toolsData.length} tools`);
        loadError = null;
        return toolsData;
    } catch (error) {
        console.error('❌ Failed to load tools:', error);
        loadError = error.message;
        throw error;
    } finally {
        isLoading = false;
    }
}

/**
 * Get all tools
 */
function getAllTools() {
    return toolsData || [];
}

/**
 * Search tools by query (searches name, category, description, tags)
 */
function searchTools(query) {
    if (!toolsData) return [];
    if (!query || query.trim() === '') return toolsData;

    const lowerQuery = query.toLowerCase().trim();
    return toolsData.filter(tool => {
        // Search in name
        if (tool.name && tool.name.toLowerCase().includes(lowerQuery)) return true;

        // Search in category
        if (tool.category && tool.category.toLowerCase().includes(lowerQuery)) return true;

        // Search in description
        if (tool.description && tool.description.toLowerCase().includes(lowerQuery)) return true;

        // Search in tags
        if (tool.tags && Array.isArray(tool.tags)) {
            return tool.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
        }

        return false;
    });
}

/**
 * Filter tools by category
 */
function filterByCategory(category) {
    if (!toolsData) return [];
    if (!category || category.trim() === '') return toolsData;

    const lowerCategory = category.toLowerCase().trim();
    return toolsData.filter(tool =>
        tool.category && tool.category.toLowerCase() === lowerCategory
    );
}

/**
 * Get tool by ID
 */
function getToolById(id) {
    if (!toolsData) return null;
    return toolsData.find(tool => tool.id === id) || null;
}

/**
 * Get all unique categories
 */
function getAllCategories() {
    if (!toolsData) return [];
    const categories = new Set();
    toolsData.forEach(tool => {
        if (tool.category) categories.add(tool.category);
    });
    return Array.from(categories).sort();
}

// Recommended tools state
let recommendedData = null;
let recommendedLoading = false;

/**
 * Load recommended tools list
 */
async function loadRecommendedList() {
    if (recommendedData) return recommendedData;
    if (recommendedLoading) {
        while (recommendedLoading) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return recommendedData;
    }

    recommendedLoading = true;
    try {
        const response = await fetch('/data/recommended.json?v=1.2');
        if (!response.ok) {
            console.warn('Recommended list not available, using fallback');
            recommendedData = { recommended_ids: [] };
            return recommendedData;
        }
        recommendedData = await response.json();
        console.log(`✅ Loaded ${recommendedData.recommended_ids.length} recommended tools`);
        return recommendedData;
    } catch (error) {
        console.warn('Failed to load recommended list, using fallback:', error.message);
        recommendedData = { recommended_ids: [] };
        return recommendedData;
    } finally {
        recommendedLoading = false;
    }
}

/**
 * Sort tools: recommended first (in order), then rest A-Z
 */
/**
 * Sort tools: recommended first (in order), then rest A-Z
 * Handles duplicate tools (same ID) by verifying total count preserved
 */
function sortToolsRecommended(tools) {
    if (!recommendedData || !recommendedData.recommended_ids) {
        // Fallback to A-Z if recommended list not loaded
        return [...tools].sort((a, b) => a.name.localeCompare(b.name));
    }

    const recommendedIds = recommendedData.recommended_ids;
    const recommendedTools = [];
    const otherTools = [];
    const processedInstances = new Set(); // Track specific tool objects to handle duplicates

    // First pass: extract recommended tools in order
    recommendedIds.forEach(id => {
        // Find ALL tools matching this ID (handling duplicates)
        const matchingTools = tools.filter(t => t.id === id);
        matchingTools.forEach(tool => {
            if (!processedInstances.has(tool)) {
                recommendedTools.push(tool);
                processedInstances.add(tool);
            }
        });
    });

    // Second pass: collect remaining tools
    tools.forEach(tool => {
        if (!processedInstances.has(tool)) {
            otherTools.push(tool);
        }
    });

    // Sort remaining tools A-Z
    otherTools.sort((a, b) => a.name.localeCompare(b.name));

    // Combine: recommended first, then others
    return [...recommendedTools, ...otherTools];
}

/**
 * Filter tools by Free Tier
 */
function filterByFreeTier(tools) {
    if (!tools) return [];
    return tools.filter(tool => tool.has_free_tier === true);
}

/**
 * Sort tools: Free Tier first, then Recommended, then A-Z
 */
function sortToolsFreeFirst(tools) {
    const freeTools = [];
    const otherTools = [];

    // Split by free tier
    tools.forEach(tool => {
        if (tool.has_free_tier === true) {
            freeTools.push(tool);
        } else {
            otherTools.push(tool);
        }
    });

    // Sort both groups by recommended/A-Z logic
    const sortedFree = sortToolsRecommended(freeTools);
    const sortedOther = sortToolsRecommended(otherTools);

    return [...sortedFree, ...sortedOther];
}

/**
 * Show error message to user
 */
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'padding: 20px; margin: 20px; background: #ff4444; color: white; border-radius: 4px; text-align: center;';
    errorDiv.textContent = message;
    document.body.insertBefore(errorDiv, document.body.firstChild);
}

// Auto-load on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            await loadTools();
        } catch (error) {
            showError('Failed to load tools data. Please refresh the page.');
        }
    });
} else {
    loadTools().catch(error => {
        showError('Failed to load tools data. Please refresh the page.');
    });
}

/**
 * Shared Tool Card Renderer — Phase 6.4
 * Fixes: clean pricing labels (no UNKNOWN), Google favicon logo chain, local initials fallback.
 * @param {Object} tool - Tool data object
 * @param {Array} recommendedIds - Unused (reserved for future visual cue)
 * @param {String} source - Analytics source context (default: 'list')
 * @returns {HTMLElement} - The fully constructed card element
 */
function renderToolCard(tool, recommendedIds = [], source = 'list') {
    const card = document.createElement('div');
    card.className = 'tool-card';

    const domain = getDomain(tool.website_url);
    const description = typeof getDescriptionForTool === 'function'
        ? getDescriptionForTool(tool.id)
        : (tool.description || '');

    // Analytics source tagging — preserved exactly
    const clickSource = source === 'category' ? 'category_list' : 'browse_list';
    const detailSource = source === 'category' ? 'category_details' : 'browse_details';
    const outSource = source === 'category' ? 'category_outbound' : 'browse_outbound';

    // ── Pricing Badge (strict normalisation) ────────────────────────────────
    // Accepted raw values from tools.json and their display mappings.
    const PRICING_MAP = {
        'free': { label: 'Free', cls: 'pricing-FREE' },
        'freemium': { label: 'Freemium', cls: 'pricing-FREEMIUM' },
        'paid': { label: 'Paid', cls: 'pricing-PAID' },
        'free trial': { label: 'Free trial', cls: 'pricing-FREE_TRIAL' },
        'free_trial': { label: 'Free trial', cls: 'pricing-FREE_TRIAL' },
    };

    const rawModel = (tool.pricing_model || '').trim().toLowerCase();
    const pricingEntry = PRICING_MAP[rawModel];

    let pricingBadgeHTML = '';
    if (pricingEntry) {
        // Known model → full badge
        pricingBadgeHTML = `<span class="pricing-badge ${pricingEntry.cls}">${pricingEntry.label}</span>`;
    } else if (tool.has_free_tier === true) {
        // Unknown model but free tier confirmed
        pricingBadgeHTML = `<span class="pricing-badge pricing-FREE">Free tier</span>`;
    }
    // else: no badge at all — keeps card clean

    // ── Logo (3-tier fallback, no external avatar services) ─────────────────
    // Tier 1: tool.logo_url (from data)
    // Tier 2: Google favicon CDN (fast, no mixed content issues)
    // Tier 3: Local initials badge (pure CSS/DOM — no external call)
    const initials = (tool.name || '??').trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
    const faviconUrl = domain && domain !== 'N/A'
        ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
        : '';

    let logoHTML;
    if (tool.logo_url) {
        // Tier 1 → Tier 3 on error
        logoHTML = `<img class="tool-logo" src="${tool.logo_url}" alt="${tool.name} logo" width="44" height="44" loading="lazy"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="tool-logo-initials" style="display:none;">${initials}</div>`;
    } else if (faviconUrl) {
        // Tier 2 → Tier 3 on error
        logoHTML = `<img class="tool-logo" src="${faviconUrl}" alt="${tool.name} logo" width="44" height="44" loading="lazy"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="tool-logo-initials" style="display:none;">${initials}</div>`;
    } else {
        // Tier 3 only
        logoHTML = `<div class="tool-logo-initials">${initials}</div>`;
    }

    card.innerHTML = `
      ${pricingBadgeHTML}
      <div class="tool-card-top">
        <div class="tool-logo-wrap">${logoHTML}</div>
        <div class="tool-card-meta">
          <h3 class="tool-name">
            <a href="/tool.html?id=${encodeURIComponent(tool.id)}"
               onclick="if(window.Analytics) Analytics.track('tool_card_click', { tool_id: '${tool.id}', source: '${clickSource}' })">${tool.name}</a>
          </h3>
          <div class="tool-category">${tool.category || 'Uncategorized'}</div>
        </div>
      </div>
      <p class="tool-description">${description || '&nbsp;'}</p>
      <div class="tool-card-actions">
        <a href="/tool.html?id=${encodeURIComponent(tool.id)}" class="tc-btn-primary"
           onclick="if(window.Analytics) Analytics.track('tool_card_click', { tool_id: '${tool.id}', source: '${detailSource}' })">View Details</a>
        ${tool.website_url
            ? `<a href="${tool.website_url}" target="_blank" rel="noopener" class="tc-btn-secondary"
               onclick="if(window.Analytics) Analytics.track('tool_outbound_click', { tool_id: '${tool.id}', url: '${tool.website_url}', source: '${outSource}' })">Visit →</a>`
            : ''}
      </div>
    `;

    return card;
}

