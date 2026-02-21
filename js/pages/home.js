// js/pages/home.js
// Handles dynamic rendering on the homepage

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const tools = await loadTools();

        // Render Featured Tools (Pick 6 specific IDs or fallbacks)
        renderFeaturedTools(tools);

        // Render Category Grid (Calculate counts dynamically)
        renderCategoryGrid(tools);

        // Phase 13.1 Motion System hook: Add Observer to fresh dynamic cards
        setTimeout(() => {
            if (window.WhompRevealObserver) {
                document.querySelectorAll('#home-featured-tools .tool-card, #home-category-grid .content-card').forEach(el => {
                    window.WhompRevealObserver.observe(el);
                });
            }
        }, 100);

    } catch (e) {
        console.error("Home page dynamic rendering failed:", e);
    }
});

function renderFeaturedTools(allTools) {
    const container = document.getElementById('home-featured-tools');
    if (!container) return;

    // Fallback: Just grab 6 verified tools
    const featured = allTools
        .filter(t => t.pricing_confidence >= 3)
        .slice(0, 6);

    container.innerHTML = '';

    if (featured.length === 0) {
        container.innerHTML = '<p>No featured tools found.</p>';
        return;
    }

    // Use the global renderToolCard from main.js
    featured.forEach(tool => {
        const card = renderToolCard(tool, [], 'home_featured');
        container.appendChild(card);
    });
}

function renderCategoryGrid(allTools) {
    const container = document.getElementById('home-category-grid');
    if (!container) return;

    // Compute category counts
    const categoryCounts = {};
    allTools.forEach(tool => {
        if (!tool.category) return;
        const cat = tool.category;
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    // Convert to sorted array
    const sortedCategories = Object.keys(categoryCounts)
        .sort((a, b) => categoryCounts[b] - categoryCounts[a]) // sort by count descending
        .slice(0, 8); // Take top 8 categories

    container.innerHTML = '';

    sortedCategories.forEach(cat => {
        const card = document.createElement('a');
        card.href = `/category/${encodeURIComponent(cat.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-'))}.html`;
        card.className = 'content-card';
        card.style.textDecoration = 'none';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.justifyContent = 'space-between';
        card.style.minHeight = '140px';

        card.innerHTML = `
            <div>
                <h3 style="margin-bottom: 8px;">${cat}</h3>
            </div>
            <div style="font-size: var(--text-sm); color: var(--c-text-muted); display: flex; align-items: center; justify-content: space-between;">
                <span>${categoryCounts[cat]} Tools</span>
                <span style="color: var(--c-accent);">&rarr;</span>
            </div>
        `;

        // Add hover effect via JS/inline
        card.addEventListener('mouseenter', () => card.style.borderColor = 'var(--c-accent)');
        card.addEventListener('mouseleave', () => card.style.borderColor = 'var(--c-border)');

        container.appendChild(card);
    });
}
