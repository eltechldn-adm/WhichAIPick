// WhichAIPick - Main Data Loader
// Phase 1: Minimal functional wiring only

let toolsData = null;
let isLoading = false;
let loadError = null;

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
        const response = await fetch('data/tools.json?v=1.6');
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
        const response = await fetch('data/recommended.json?v=1.2');
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
