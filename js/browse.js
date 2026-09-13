let allTools = [];
let filteredTools = [];
let currentPage = 1;
let itemsPerPage = 30;
let recommendedIds = []; // Global state for visual recommendations

// Get config if it exists
const browseConfig = window.BROWSE_CONFIG || {};

// Render tools
function renderTools() {
  const container = document.getElementById('browse-list');
  if (!container) return;
  
  const start = (currentPage - 1) * itemsPerPage;
  const end = Math.min(start + itemsPerPage, filteredTools.length);

  container.innerHTML = '';
  const fragment = document.createDocumentFragment();

  for (let i = start; i < end; i++) {
    const tool = filteredTools[i];
    // Use shared renderer from main.js
    // Pass tool, recommendedIds, and 'browse' as source context
    const card = renderToolCard(tool, recommendedIds, 'browse');
    fragment.appendChild(card);
  }

  container.appendChild(fragment);

  updatePagination();
  updateStats();
}

// Update pagination
function updatePagination() {
  const container = document.getElementById('load-more-container');
  if (!container) return;
  
  const totalPages = Math.ceil(filteredTools.length / itemsPerPage);

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '<div class="pagination" style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 2rem;">';
  
  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage) {
      html += `<button class="btn btn-primary" disabled>${i}</button>`;
    } else {
      html += `<button class="btn btn-secondary page-btn" data-page="${i}">${i}</button>`;
    }
  }

  if (currentPage < totalPages) {
    html += `<button class="btn btn-secondary page-btn" data-page="${currentPage + 1}">Next →</button>`;
  }

  html += '</div>';
  container.innerHTML = html;

  const btns = container.querySelectorAll('.page-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentPage = parseInt(e.target.getAttribute('data-page'));
      renderTools();
      const browseContainer = document.getElementById('browse-container');
      if (browseContainer) {
          browseContainer.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

// Update stats
function updateStats() {
  const stats = document.getElementById('browse-stats');
  if (!stats) return;
  
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, filteredTools.length);
  stats.textContent = `Showing ${filteredTools.length > 0 ? start : 0}-${end} of ${filteredTools.length} tools`;
}

// Filter and sort
function applyFilters() {
  currentPage = 1;
  
  const searchInput = document.getElementById('search-input');
  const sortSelect = document.getElementById('sort-select');
  const categorySelect = document.getElementById('category-select');
  const freeTierToggle = document.getElementById('free-tier-toggle');
  
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  const sortOrder = sortSelect ? sortSelect.value : 'recommended';
  
  // Use category from dropdown, or fall back to config (for category pages)
  let selectedCategory = '';
  if (categorySelect && categorySelect.value !== "") {
      selectedCategory = categorySelect.value;
  } else if (browseConfig.category) {
      selectedCategory = browseConfig.category;
  }
  
  const freeTierOnly = freeTierToggle ? freeTierToggle.checked : false;

  // Filter by search, category, and free tier
  filteredTools = allTools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm) || 
                          (tool.description && tool.description.toLowerCase().includes(searchTerm));
    const matchesCategory = !selectedCategory || tool.category === selectedCategory;
    const matchesFree = !freeTierOnly || tool.has_free_tier === true;
    return matchesSearch && matchesCategory && matchesFree;
  });

  // Track events for filters
  if (freeTierOnly && window.Analytics) Analytics.track('free_tier_toggle', { action: 'enable' });
  if (sortOrder === 'free_first' && window.Analytics) Analytics.track('free_first_sort', { action: 'sort' });

  // Sort
  if (sortOrder === 'recommended') {
    filteredTools = sortToolsRecommended(filteredTools);
  } else if (sortOrder === 'free_first') {
    filteredTools = sortToolsFreeFirst(filteredTools); // Uses main.js helper
  } else if (sortOrder === 'az') {
    filteredTools.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortOrder === 'za') {
    filteredTools.sort((a, b) => b.name.localeCompare(a.name));
  }

  renderTools();
}

// Initialize
async function init() {
  try {
    await loadTools();
    await loadDescriptions(); // Load descriptions for cards

    // Load recommended list for visual highlighting
    const recData = await loadRecommendedList();
    recommendedIds = recData ? recData.recommended_ids : [];

    allTools = getAllTools();
    
    // Base filter: if we are on a category page, pre-filter right away.
    if (browseConfig.category) {
        filteredTools = allTools.filter(t => t.category === browseConfig.category);
    } else {
        filteredTools = [...allTools];
    }

    // Extract unique categories (excluding Uncategorized)
    const categorySelect = document.getElementById('category-select');
    if (categorySelect) {
        const categories = new Set();
        allTools.forEach(tool => {
          if (tool.category && tool.category !== 'Uncategorized') {
            categories.add(tool.category);
          }
        });

        // Populate category dropdown
        const sortedCategories = Array.from(categories).sort();
        sortedCategories.forEach(category => {
          const option = document.createElement('option');
          option.value = category;
          option.textContent = category;
          categorySelect.appendChild(option);
        });
    }

    // Use main.js sort helper which uses its internal rec data, 
    // but we also have local recommendedIds for visual class
    filteredTools = sortToolsRecommended(filteredTools);

    renderTools();

    // Event listeners
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.addEventListener('change', applyFilters);
    
    if (categorySelect) categorySelect.addEventListener('change', applyFilters);
    
    const itemsPerPageSelect = document.getElementById('items-per-page-select');
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', (e) => {
          itemsPerPage = parseInt(e.target.value);
          currentPage = 1;
          renderTools();
        });
    }

    const freeTierToggle = document.getElementById('free-tier-toggle');
    if (freeTierToggle) {
      freeTierToggle.addEventListener('change', applyFilters);
    }

  } catch (error) {
    console.error("Error loading browse tools:", error);
    const container = document.getElementById('browse-list');
    if (container) {
        container.innerHTML = '<p style="text-align: center;">Failed to load tools.</p>';
    }
  }
}

// Start app
// We don't need DOMContentLoaded since this script is loaded with defer
init();
