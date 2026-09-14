// Browse Engine
const BROWSE_CONFIG = window.BROWSE_CONFIG || {};

// Mock Analytics for Phase 8 preparation
window.Analytics = window.Analytics || {
    track: (event, data) => {
        // console.log('Analytics Event:', event, data);
    }
};

const USE_CASE_TAXONOMY = {
    'Writing & Content': ['writing', 'content', 'copywriting', 'blog', 'essay', 'summarize', 'text generation'],
    'Coding & Development': ['code', 'coding', 'development', 'programming', 'developer', 'sql', 'html', 'css', 'python'],
    'Image Creation': ['image', 'photo', 'art', 'generation', 'picture', 'avatar', 'logo', 'drawing'],
    'Video Creation': ['video', 'animation', 'editing', 'youtube', 'tiktok', 'reel'],
    'Audio & Voice': ['audio', 'voice', 'speech', 'music', 'sound', 'text-to-speech', 'podcast'],
    'Research': ['research', 'academic', 'science', 'search', 'discovery', 'analysis', 'paper'],
    'Productivity': ['productivity', 'workflow', 'task', 'time management', 'automation', 'organization'],
    'Meetings & Transcription': ['meeting', 'transcription', 'notes', 'zoom', 'teams', 'summarization'],
    'Marketing': ['marketing', 'seo', 'sales', 'advertising', 'campaign', 'email marketing', 'social media'],
    'Automation': ['automation', 'zapier', 'workflow', 'bot', 'agent'],
    'Design': ['design', 'ui', 'ux', 'web design', 'graphic', 'presentation', 'slides'],
    'Data & Analytics': ['data', 'analytics', 'spreadsheet', 'excel', 'csv', 'chart', 'graph'],
    'Customer Support': ['customer support', 'chatbot', 'service', 'helpdesk'],
    'Education': ['education', 'learning', 'student', 'teacher', 'course', 'quiz', 'study'],
    'Business Operations': ['business', 'finance', 'hr', 'legal', 'contract', 'invoice', 'operations']
};

class DirectoryEngine {
    constructor() {
        this.tools = [];
        this.filteredTools = [];
        this.currentPage = 1;
        this.itemsPerPage = 30;

        // UI State
        this.searchTerm = '';
        this.sortOrder = 'az'; // Default is now A-Z
        this.activeFilters = {
            freeTier: [],
            pricing: [],
            category: [],
            useCase: []
        };

        // Cache DOM elements
        this.elements = {
            container: document.getElementById('browse-list'),
            stats: document.getElementById('directory-count'),
            emptyState: document.getElementById('directory-empty-state'),
            loadMoreContainer: document.getElementById('load-more-container'),
            searchInput: document.getElementById('search-input'),
            sortSelect: document.getElementById('sort-select'),
            activeFiltersList: document.getElementById('active-filters-list'),
            activeFiltersContainer: document.getElementById('active-filters'),
            clearFiltersBtn: document.getElementById('clear-filters-btn'),
            emptyClearBtn: document.getElementById('empty-clear-btn'),
            
            pricingBox: document.getElementById('pricing-checkboxes'),
            categoryBox: document.getElementById('category-checkboxes'),
            useCaseBox: document.getElementById('usecase-checkboxes'),
            categoryGroup: document.getElementById('filter-group-category'),
            
            mobileFiltersBtn: document.getElementById('mobile-filters-btn'),
            sidebar: document.getElementById('directory-sidebar'),
            closeSidebarBtn: document.getElementById('close-sidebar-btn')
        };
    }

    async init() {
        try {
            await Promise.all([
                loadTools(),
                loadDescriptions()
            ]);
            
            this.tools = getAllTools();

            this.setupFilterOptions();
            this.bindEvents();
            this.readUrlState();
            
            // Lock category if BROWSE_CONFIG is set
            if (BROWSE_CONFIG.category) {
                if (this.elements.categoryGroup) {
                    this.elements.categoryGroup.style.display = 'none';
                }
            }
            
            this.applyFilters();
        } catch (error) {
            console.error("Error initializing directory engine:", error);
            if (this.elements.container) {
                this.elements.container.innerHTML = '<p style="text-align: center;">Failed to load tools database.</p>';
            }
        }
    }

    setupFilterOptions() {
        // Helper to generate checkboxes with Show More
        const generateCheckboxes = (items, name) => {
            const VISIBLE_COUNT = 6;
            const visibleItems = items.slice(0, VISIBLE_COUNT);
            const hiddenItems = items.slice(VISIBLE_COUNT);
            
            let html = visibleItems.map(item => {
                return `<label class="filter-checkbox-label">
                    <input type="checkbox" name="${name}" value="${item}"> 
                    <span class="filter-label-text">${item}</span>
                </label>`;
            }).join('');
            
            if (hiddenItems.length > 0) {
                html += `<div class="hidden-options" style="display: none;">
                    ${hiddenItems.map(item => {
                        return `<label class="filter-checkbox-label">
                            <input type="checkbox" name="${name}" value="${item}"> 
                            <span class="filter-label-text">${item}</span>
                        </label>`;
                    }).join('')}
                </div>
                <button type="button" class="show-more-btn" data-target="${name}" style="background:none; border:none; color:var(--c-accent); font-size:0.85rem; cursor:pointer; padding:4px 0; margin-top:4px;">Show more</button>`;
            }
            return html;
        };

        // Extract Categories
        const categories = [...new Set(this.tools.map(t => t.category).filter(Boolean))].sort();
        if (this.elements.categoryBox) {
            this.elements.categoryBox.innerHTML = generateCheckboxes(categories, 'category');
        }

        // Pricing Models
        const explicitPricing = ['Free', 'Freemium', 'Paid', 'Enterprise'];
        if (this.elements.pricingBox) {
            this.elements.pricingBox.innerHTML = generateCheckboxes(explicitPricing, 'pricing');
        }

        // Use-Case Grouping
        const useCaseGroups = Object.keys(USE_CASE_TAXONOMY).sort();
        if (this.elements.useCaseBox) {
            this.elements.useCaseBox.innerHTML = generateCheckboxes(useCaseGroups, 'useCase');
        }
        
        // Bind Show More buttons
        if (this.elements.sidebar) {
            this.elements.sidebar.querySelectorAll('.show-more-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const hiddenDiv = e.target.previousElementSibling;
                    if (hiddenDiv.style.display === 'none') {
                        hiddenDiv.style.display = 'block';
                        e.target.textContent = 'Show less';
                    } else {
                        hiddenDiv.style.display = 'none';
                        e.target.textContent = 'Show more';
                    }
                });
            });
        }
    }

    mapUseCasesToGroups(tool) {
        const groups = new Set();
        const rawCases = Array.isArray(tool.primaryUseCases) ? tool.primaryUseCases.map(c => c.toLowerCase()) : [];
        
        Object.entries(USE_CASE_TAXONOMY).forEach(([groupName, keywords]) => {
            const matches = rawCases.some(rc => keywords.some(kw => rc.includes(kw)));
            if (matches) {
                groups.add(groupName);
            }
        });
        
        return Array.from(groups);
    }

    bindEvents() {
        // Search
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', (e) => {
                const newTerm = e.target.value.trim().toLowerCase();
                
                // If user starts typing and hasn't explicitly chosen a sort, switch to relevance.
                // If they clear the search, revert to az if they were on relevance.
                if (newTerm && !this.searchTerm && this.sortOrder === 'az') {
                    this.sortOrder = 'relevance';
                } else if (!newTerm && this.sortOrder === 'relevance') {
                    this.sortOrder = 'az';
                }
                
                this.searchTerm = newTerm;
                
                this.updateUrlState();
                this.applyFilters();
                
                clearTimeout(this._searchTimer);
                this._searchTimer = setTimeout(() => {
                    if (this.searchTerm && window.Analytics) {
                        Analytics.track('directory_search', { query: this.searchTerm });
                    }
                }, 800);
            });
        }

        if (this.elements.sortSelect) {
            this.elements.sortSelect.addEventListener('change', (e) => {
                this.sortOrder = e.target.value;
                this.updateUrlState();
                this.applyFilters();
                Analytics.track('sort_changed', { sort: this.sortOrder });
            });
        }

        if (this.elements.sidebar) {
            this.elements.sidebar.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') {
                    this.updateStateFromUI();
                    this.updateUrlState();
                    this.applyFilters();
                    
                    if (e.target.checked) {
                        Analytics.track('filter_applied', { filter: e.target.name, value: e.target.value });
                    } else {
                        Analytics.track('filter_removed', { filter: e.target.name, value: e.target.value });
                    }
                }
            });
        }

        const clearAll = () => {
            this.activeFilters = { freeTier: [], pricing: [], category: [], useCase: [] };
            if (BROWSE_CONFIG.category) {
                this.activeFilters.category = [BROWSE_CONFIG.category];
            }
            this.searchTerm = '';
            if (this.elements.searchInput) this.elements.searchInput.value = '';
            this.sortOrder = 'az';
            if (this.elements.sortSelect) this.elements.sortSelect.value = 'az';
            
            if (this.elements.sidebar) {
                this.elements.sidebar.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
            }
            
            this.updateUrlState();
            this.applyFilters();
            Analytics.track('filters_cleared', {});
        };

        if (this.elements.clearFiltersBtn) this.elements.clearFiltersBtn.addEventListener('click', clearAll);
        if (this.elements.emptyClearBtn) this.elements.emptyClearBtn.addEventListener('click', clearAll);

        // Mobile Sidebar Toggles
        const openSidebar = () => {
            this.elements.sidebar.classList.add('is-open');
            this.elements.sidebar.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
            
            // Focus trap - focus first input
            const firstInput = this.elements.sidebar.querySelector('input, button');
            if (firstInput) firstInput.focus();
        };
        
        const closeSidebar = () => {
            this.elements.sidebar.classList.remove('is-open');
            this.elements.sidebar.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
            
            if (this.elements.mobileFiltersBtn) {
                this.elements.mobileFiltersBtn.focus();
            }
        };

        if (this.elements.mobileFiltersBtn) {
            this.elements.mobileFiltersBtn.setAttribute('aria-controls', 'directory-sidebar');
            this.elements.mobileFiltersBtn.addEventListener('click', openSidebar);
        }
        if (this.elements.closeSidebarBtn) {
            this.elements.closeSidebarBtn.addEventListener('click', closeSidebar);
        }
        
        // Escape key to close sidebar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.sidebar && this.elements.sidebar.classList.contains('is-open')) {
                closeSidebar();
            }
        });

        window.addEventListener('popstate', () => {
            this.readUrlState();
            this.applyFilters();
        });
        
        if (this.elements.activeFiltersList) {
            this.elements.activeFiltersList.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (btn) {
                    const group = btn.dataset.group;
                    const value = btn.dataset.value;
                    if (group && value) {
                        this.activeFilters[group] = this.activeFilters[group].filter(v => v !== value);
                        const cb = this.elements.sidebar.querySelector(`input[name="${group}"][value="${value}"]`);
                        if (cb) cb.checked = false;
                        
                        this.updateUrlState();
                        this.applyFilters();
                        Analytics.track('filter_removed', { filter: group, value: value });
                    }
                }
            });
        }
        
        // Track Tool Clicks
        if (this.elements.container) {
            this.elements.container.addEventListener('click', (e) => {
                const card = e.target.closest('.tool-card');
                if (card) {
                    const toolName = card.querySelector('h3')?.textContent || 'Unknown Tool';
                    Analytics.track('tool_card_clicked', { tool: toolName });
                }
            });
        }
    }

    updateStateFromUI() {
        this.activeFilters = { freeTier: [], pricing: [], category: [], useCase: [] };
        if (BROWSE_CONFIG.category) {
            this.activeFilters.category = [BROWSE_CONFIG.category];
        }
        if (!this.elements.sidebar) return;

        this.elements.sidebar.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
            const group = cb.name || cb.closest('.filter-group').id.replace('filter-group-', '');
            if (this.activeFilters[group] && !this.activeFilters[group].includes(cb.value)) {
                this.activeFilters[group].push(cb.value);
            }
        });
    }

    updateUIFromState() {
        if (!this.elements.sidebar) return;
        
        this.elements.sidebar.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            const group = cb.name || cb.closest('.filter-group').id.replace('filter-group-', '');
            cb.checked = this.activeFilters[group] && this.activeFilters[group].includes(cb.value);
        });
        
        if (this.elements.searchInput) this.elements.searchInput.value = this.searchTerm;
        if (this.elements.sortSelect) {
            if (this.sortOrder === 'relevance' && ![...this.elements.sortSelect.options].some(o => o.value === 'relevance')) {
                // If relevance isn't an option, just leave it as az visually but logic handles it
            } else {
                this.elements.sortSelect.value = this.sortOrder === 'relevance' ? 'az' : this.sortOrder;
            }
        }
        
        this.updateMobileFilterCount();
    }
    
    updateMobileFilterCount() {
        if (!this.elements.mobileFiltersBtn) return;
        let count = 0;
        count += this.activeFilters.freeTier.length;
        count += this.activeFilters.pricing.length;
        count += this.activeFilters.useCase.length;
        
        // Don't count category if it's fixed
        if (BROWSE_CONFIG.category) {
            count += Math.max(0, this.activeFilters.category.length - 1);
        } else {
            count += this.activeFilters.category.length;
        }
        
        this.elements.mobileFiltersBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            Filters ${count > 0 ? `(${count})` : ''}
        `;
    }

    readUrlState() {
        const params = new URLSearchParams(window.location.search);
        this.searchTerm = (params.get('q') || '').trim().toLowerCase();
        
        // Safely parse sort
        const allowedSorts = ['az', 'za', 'free_first'];
        const urlSort = params.get('sort');
        if (urlSort && allowedSorts.includes(urlSort)) {
            this.sortOrder = urlSort;
        } else if (this.searchTerm) {
            this.sortOrder = 'relevance';
        } else {
            this.sortOrder = 'az';
        }
        
        const parseList = (val) => val ? val.split(',').filter(Boolean) : [];
        this.activeFilters.category = parseList(params.get('category'));
        this.activeFilters.pricing = parseList(params.get('pricing'));
        this.activeFilters.useCase = parseList(params.get('useCase'));
        this.activeFilters.freeTier = parseList(params.get('freeTier'));
        
        if (BROWSE_CONFIG.category && !this.activeFilters.category.includes(BROWSE_CONFIG.category)) {
             this.activeFilters.category.push(BROWSE_CONFIG.category);
        }

        this.updateUIFromState();
    }

    updateUrlState() {
        const params = new URLSearchParams();
        if (this.searchTerm) params.set('q', this.searchTerm);
        if (this.sortOrder && this.sortOrder !== 'az' && this.sortOrder !== 'relevance') params.set('sort', this.sortOrder);
        
        if (this.activeFilters.category.length > 0) {
             const cats = this.activeFilters.category.filter(c => c !== BROWSE_CONFIG.category);
             if (cats.length > 0) params.set('category', cats.join(','));
        }
        if (this.activeFilters.pricing.length > 0) params.set('pricing', this.activeFilters.pricing.join(','));
        if (this.activeFilters.useCase.length > 0) params.set('useCase', this.activeFilters.useCase.join(','));
        if (this.activeFilters.freeTier.length > 0) params.set('freeTier', this.activeFilters.freeTier.join(','));
        
        const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        window.history.pushState({}, '', newUrl);
        
        this.updateMobileFilterCount();
    }
    
    renderFilterChips() {
        if (!this.elements.activeFiltersContainer || !this.elements.activeFiltersList) return;
        
        let chips = [];
        
        // Remove existing clear buttons from sidebar headers
        if (this.elements.sidebar) {
            this.elements.sidebar.querySelectorAll('.filter-group-clear').forEach(el => el.remove());
        }
        
        Object.entries(this.activeFilters).forEach(([group, values]) => {
            const displayValues = group === 'category' && BROWSE_CONFIG.category 
                ? values.filter(v => v !== BROWSE_CONFIG.category) 
                : values;
                
            if (displayValues.length > 0 && this.elements.sidebar) {
                const groupEl = this.elements.sidebar.querySelector(`#filter-group-${group} summary`);
                if (groupEl) {
                    const clearBtn = document.createElement('button');
                    clearBtn.className = 'filter-group-clear';
                    clearBtn.textContent = 'Clear';
                    clearBtn.setAttribute('aria-label', `Clear ${group} filters`);
                    clearBtn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.activeFilters[group] = group === 'category' && BROWSE_CONFIG.category ? [BROWSE_CONFIG.category] : [];
                        this.updateUrlState();
                        this.applyFilters();
                        Analytics.track('filter_group_cleared', { group });
                    };
                    // Insert before the chevron
                    const chevron = groupEl.querySelector('.chevron');
                    if (chevron) {
                        groupEl.insertBefore(clearBtn, chevron);
                    } else {
                        groupEl.appendChild(clearBtn);
                    }
                }
            }
                
            displayValues.forEach(val => {
                let label = val;
                if (group === 'freeTier') label = val === 'has_free_tier' ? 'Free Tier Available' : 'No Free Tier';
                if (group === 'pricing') label = val.charAt(0).toUpperCase() + val.slice(1);
                
                chips.push(`
                    <span class="filter-chip">
                        ${label}
                        <button data-group="${group}" data-value="${val}" aria-label="Remove ${label} filter">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                    </span>
                `);
            });
        });
        
        if (chips.length > 0) {
            this.elements.activeFiltersList.innerHTML = chips.join('');
            this.elements.activeFiltersContainer.style.display = 'flex';
        } else {
            this.elements.activeFiltersContainer.style.display = 'none';
        }
    }

    computeSearchScore(tool, term) {
        if (!term) return 0;
        let score = 0;
        const name = (tool.name || '').toLowerCase();
        
        if (name === term) score += 100;
        else if (name.startsWith(term)) score += 60;
        else if (name.includes(term)) score += 30;

        const aliases = [...(tool.aliases || [])];
        if (tool.previousName) aliases.push(tool.previousName);
        
        if (aliases.some(a => a.toLowerCase() === term)) score += 80;
        else if (aliases.some(a => a.toLowerCase().includes(term))) score += 40;

        if (Array.isArray(tool.primaryUseCases) && tool.primaryUseCases.some(uc => uc.toLowerCase().includes(term))) score += 40;
        if (tool.category && tool.category.toLowerCase().includes(term)) score += 30;
        if (Array.isArray(tool.bestFor) && tool.bestFor.some(bf => bf.toLowerCase().includes(term))) score += 20;
        if (tool.description && tool.description.toLowerCase().includes(term)) score += 10;
        
        return score;
    }

    applyFilters() {
        this.currentPage = 1;
        this.renderFilterChips();

        let searchScores = {};
        if (this.searchTerm) {
            this.tools.forEach(t => {
                searchScores[t.id] = this.computeSearchScore(t, this.searchTerm);
            });
            // Propagate successor boosting
            this.tools.forEach(t => {
                if (searchScores[t.id] > 0 && t.successorToolId) {
                    if (searchScores[t.successorToolId] !== undefined) {
                        searchScores[t.successorToolId] = (searchScores[t.successorToolId] || 0) + Math.max(searchScores[t.id], 100);
                        searchScores[t.id] = Math.max(0, searchScores[t.id] - 50);
                    }
                }
            });
        }

        this.filteredTools = this.tools.filter(tool => {
            if (this.searchTerm && (searchScores[tool.id] || 0) === 0) {
                return false;
            }

            if (this.activeFilters.category.length > 0 && !this.activeFilters.category.includes(tool.category)) {
                return false;
            }

            if (this.activeFilters.pricing.length > 0) {
                let model = (tool.pricingModel || tool.pricing_model || '').trim().toLowerCase();
                if (model === 'free trial' || model === 'free_trial') model = 'paid';
                const activePricingLower = this.activeFilters.pricing.map(p => p.toLowerCase());
                if (!activePricingLower.includes(model)) return false;
            }

            if (this.activeFilters.freeTier.length > 0) {
                const wantsFree = this.activeFilters.freeTier.includes('has_free_tier');
                const wantsNoFree = this.activeFilters.freeTier.includes('no_free_tier');
                const hasFree = tool.hasFreeTier === true || tool.has_free_tier === true;
                const isNoFree = tool.hasFreeTier === false || tool.has_free_tier === false;
                
                const matchesFree = wantsFree && hasFree;
                const matchesNoFree = wantsNoFree && isNoFree;
                
                if (!matchesFree && !matchesNoFree) return false;
            }
            
            if (this.activeFilters.useCase.length > 0) {
                const toolGroups = this.mapUseCasesToGroups(tool);
                const matches = toolGroups.some(g => this.activeFilters.useCase.includes(g));
                if (!matches) return false;
            }

            return true;
        });

        if (this.searchTerm && this.sortOrder === 'relevance') {
            this.filteredTools.forEach(t => t._searchScore = searchScores[t.id]);
            this.filteredTools.sort((a, b) => b._searchScore - a._searchScore);
        } else if (this.sortOrder === 'free_first') {
            this.filteredTools.sort((a, b) => {
                const aFree = (a.hasFreeTier === true || a.has_free_tier === true);
                const bFree = (b.hasFreeTier === true || b.has_free_tier === true);
                if (aFree !== bFree) return aFree ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
        } else if (this.sortOrder === 'az') {
            this.filteredTools.sort((a, b) => a.name.localeCompare(b.name));
        } else if (this.sortOrder === 'za') {
            this.filteredTools.sort((a, b) => b.name.localeCompare(a.name));
        }

        this.render();
    }

    render() {
        if (!this.elements.container) return;
        
        if (this.elements.stats) {
            this.elements.stats.textContent = `${this.filteredTools.length} tools found`;
            this.elements.stats.setAttribute('aria-label', `${this.filteredTools.length} tools found`);
        }

        if (this.filteredTools.length === 0) {
            this.elements.container.innerHTML = '';
            if (this.elements.emptyState) this.elements.emptyState.style.display = 'block';
            if (this.elements.loadMoreContainer) this.elements.loadMoreContainer.innerHTML = '';
            return;
        }
        
        if (this.elements.emptyState) this.elements.emptyState.style.display = 'none';

        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = Math.min(start + this.itemsPerPage, this.filteredTools.length);

        const fragment = document.createDocumentFragment();
        for (let i = start; i < end; i++) {
            const tool = this.filteredTools[i];
            const card = renderToolCard(tool, 'browse');
            fragment.appendChild(card);
        }

        this.elements.container.innerHTML = '';
        this.elements.container.appendChild(fragment);

        this.renderPagination();
    }

    renderPagination() {
        const container = this.elements.loadMoreContainer;
        if (!container) return;
        
        const totalPages = Math.ceil(this.filteredTools.length / this.itemsPerPage);

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '<div class="pagination" style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 2rem;">';
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === this.currentPage) {
                html += `<button class="btn btn-primary" disabled>${i}</button>`;
            } else {
                html += `<button class="btn btn-secondary page-btn" data-page="${i}">${i}</button>`;
            }
        }

        if (this.currentPage < totalPages) {
            html += `<button class="btn btn-secondary page-btn" data-page="${this.currentPage + 1}">Next →</button>`;
        }

        html += '</div>';
        container.innerHTML = html;

        container.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentPage = parseInt(e.target.getAttribute('data-page'));
                this.render();
                const header = document.querySelector('.directory-header');
                if (header) header.scrollIntoView({ behavior: 'smooth' });
            });
        });
    }
}

// Initialize when scripts are loaded
const app = new DirectoryEngine();
app.init();
