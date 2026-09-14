// Browse Engine
const BROWSE_CONFIG = window.BROWSE_CONFIG || {};

class DirectoryEngine {
    constructor() {
        this.tools = [];
        this.recommendedIds = [];
        this.filteredTools = [];
        this.currentPage = 1;
        this.itemsPerPage = 30;

        // UI State
        this.searchTerm = '';
        this.sortOrder = 'recommended';
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
            
            // Checkbox containers
            pricingBox: document.getElementById('pricing-checkboxes'),
            categoryBox: document.getElementById('category-checkboxes'),
            useCaseBox: document.getElementById('usecase-checkboxes'),
            
            // Mobile toggle
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
            
            const recData = await loadRecommendedList();
            this.recommendedIds = recData ? recData.recommended_ids : [];

            this.setupFilterOptions();
            this.bindEvents();
            this.readUrlState();
            
            this.applyFilters();
        } catch (error) {
            console.error("Error initializing directory engine:", error);
            if (this.elements.container) {
                this.elements.container.innerHTML = '<p style="text-align: center;">Failed to load tools database.</p>';
            }
        }
    }

    setupFilterOptions() {
        // Extract Categories
        const categories = [...new Set(this.tools.map(t => t.category).filter(Boolean))].sort();
        if (this.elements.categoryBox) {
            this.elements.categoryBox.innerHTML = categories.map(cat => 
                `<label class="filter-checkbox-label">
                    <input type="checkbox" name="category" value="${cat}"> ${cat}
                </label>`
            ).join('');
        }

        // Extract Pricing Models
        const actualModels = [...new Set(this.tools.map(t => (t.pricingModel || t.pricing_model || '').trim().toLowerCase()).filter(Boolean))];
        const uniqueModels = [...new Set(actualModels.map(m => m === 'free trial' || m === 'free_trial' ? 'Paid' : m.charAt(0).toUpperCase() + m.slice(1)))].sort();
        
        if (this.elements.pricingBox) {
            this.elements.pricingBox.innerHTML = uniqueModels.map(model => 
                `<label class="filter-checkbox-label">
                    <input type="checkbox" name="pricing" value="${model.toLowerCase()}"> ${model}
                </label>`
            ).join('');
        }

        // Extract Use Cases
        const useCases = new Set();
        this.tools.forEach(t => {
            if (t.primaryUseCases && Array.isArray(t.primaryUseCases)) {
                t.primaryUseCases.forEach(uc => useCases.add(uc.trim()));
            }
        });
        const sortedUseCases = [...useCases].sort();
        if (this.elements.useCaseBox) {
            this.elements.useCaseBox.innerHTML = sortedUseCases.map(uc => 
                `<label class="filter-checkbox-label">
                    <input type="checkbox" name="useCase" value="${uc}"> ${uc}
                </label>`
            ).join('');
        }
    }

    bindEvents() {
        // Search & Sort
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                if (this.searchTerm && this.sortOrder === 'recommended') {
                    this.sortOrder = 'relevance';
                } else if (!this.searchTerm && this.sortOrder === 'relevance') {
                    this.sortOrder = 'recommended';
                }
                this.updateUrlState();
                this.applyFilters();
                
                // Track search
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
            });
        }

        // Checkboxes delegation
        if (this.elements.sidebar) {
            this.elements.sidebar.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') {
                    this.updateStateFromUI();
                    this.updateUrlState();
                    this.applyFilters();
                    
                    if (window.Analytics) {
                        Analytics.track('filter_applied', { filter: e.target.name, value: e.target.value, checked: e.target.checked });
                    }
                }
            });
        }

        // Clear all buttons
        const clearAll = () => {
            this.activeFilters = { freeTier: [], pricing: [], category: [], useCase: [] };
            this.searchTerm = '';
            if (this.elements.searchInput) this.elements.searchInput.value = '';
            this.sortOrder = 'recommended';
            if (this.elements.sortSelect) this.elements.sortSelect.value = 'recommended';
            
            if (this.elements.sidebar) {
                this.elements.sidebar.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
            }
            
            this.updateUrlState();
            this.applyFilters();
        };

        if (this.elements.clearFiltersBtn) this.elements.clearFiltersBtn.addEventListener('click', clearAll);
        if (this.elements.emptyClearBtn) this.elements.emptyClearBtn.addEventListener('click', clearAll);

        // Mobile Sidebar Toggles
        if (this.elements.mobileFiltersBtn) {
            this.elements.mobileFiltersBtn.addEventListener('click', () => {
                this.elements.sidebar.classList.add('is-open');
                document.body.style.overflow = 'hidden';
            });
        }
        if (this.elements.closeSidebarBtn) {
            this.elements.closeSidebarBtn.addEventListener('click', () => {
                this.elements.sidebar.classList.remove('is-open');
                document.body.style.overflow = '';
            });
        }

        // History API
        window.addEventListener('popstate', () => {
            this.readUrlState();
            this.applyFilters();
        });
        
        // Delegated remove chip
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
                    }
                }
            });
        }
    }

    updateStateFromUI() {
        this.activeFilters = { freeTier: [], pricing: [], category: [], useCase: [] };
        if (!this.elements.sidebar) return;

        this.elements.sidebar.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
            const group = cb.name || cb.closest('.filter-group').id.replace('filter-group-', '');
            if (this.activeFilters[group]) {
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
        if (this.elements.sortSelect && this.sortOrder !== 'relevance') {
            this.elements.sortSelect.value = this.sortOrder;
        }
    }

    readUrlState() {
        const params = new URLSearchParams(window.location.search);
        this.searchTerm = params.get('q') || '';
        this.sortOrder = params.get('sort') || (this.searchTerm ? 'relevance' : 'recommended');
        
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
        if (this.sortOrder && this.sortOrder !== 'recommended' && this.sortOrder !== 'relevance') params.set('sort', this.sortOrder);
        
        if (this.activeFilters.category.length > 0) {
             const cats = this.activeFilters.category.filter(c => c !== BROWSE_CONFIG.category);
             if (cats.length > 0) params.set('category', cats.join(','));
        }
        if (this.activeFilters.pricing.length > 0) params.set('pricing', this.activeFilters.pricing.join(','));
        if (this.activeFilters.useCase.length > 0) params.set('useCase', this.activeFilters.useCase.join(','));
        if (this.activeFilters.freeTier.length > 0) params.set('freeTier', this.activeFilters.freeTier.join(','));
        
        const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        window.history.pushState({}, '', newUrl);
    }
    
    renderFilterChips() {
        if (!this.elements.activeFiltersContainer || !this.elements.activeFiltersList) return;
        
        let chips = [];
        
        Object.entries(this.activeFilters).forEach(([group, values]) => {
            const displayValues = group === 'category' && BROWSE_CONFIG.category 
                ? values.filter(v => v !== BROWSE_CONFIG.category) 
                : values;
                
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

        const aliases = Array.isArray(tool.aliases) ? tool.aliases : [];
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

        this.filteredTools = this.tools.filter(tool => {
            if (this.searchTerm && this.computeSearchScore(tool, this.searchTerm) === 0) {
                return false;
            }

            if (this.activeFilters.category.length > 0 && !this.activeFilters.category.includes(tool.category)) {
                return false;
            }

            if (this.activeFilters.pricing.length > 0) {
                let model = (tool.pricingModel || tool.pricing_model || '').trim().toLowerCase();
                if (model === 'free trial' || model === 'free_trial') model = 'paid';
                if (!this.activeFilters.pricing.includes(model)) return false;
            }

            if (this.activeFilters.freeTier.length > 0) {
                const wantsFree = this.activeFilters.freeTier.includes('has_free_tier');
                const wantsNoFree = this.activeFilters.freeTier.includes('no_free_tier');
                const hasFree = tool.hasFreeTier === true || tool.has_free_tier === true;
                
                if (wantsFree && wantsNoFree) {
                    // allow all
                } else if (wantsFree && !hasFree) {
                    return false;
                } else if (wantsNoFree && hasFree) {
                    return false;
                }
            }
            
            if (this.activeFilters.useCase.length > 0) {
                if (!tool.primaryUseCases || !Array.isArray(tool.primaryUseCases)) return false;
                const matches = tool.primaryUseCases.some(uc => this.activeFilters.useCase.includes(uc.trim()));
                if (!matches) return false;
            }

            return true;
        });

        if (this.searchTerm && this.sortOrder === 'relevance') {
            this.filteredTools.forEach(t => {
                t._searchScore = this.computeSearchScore(t, this.searchTerm);
                if (t.successorToolId) {
                    const successor = this.filteredTools.find(s => s.id === t.successorToolId);
                    if (successor) {
                        successor._searchScore = (successor._searchScore || 0) + Math.max(t._searchScore, 10);
                        t._searchScore = Math.max(0, t._searchScore - 50);
                    }
                }
            });
            this.filteredTools.sort((a, b) => b._searchScore - a._searchScore);
        } else if (this.sortOrder === 'recommended') {
            const recommendedMap = new Map();
            this.recommendedIds.forEach((id, index) => recommendedMap.set(id, index));
            
            this.filteredTools.sort((a, b) => {
                const aEligible = a.recommendationEligible !== false;
                const bEligible = b.recommendationEligible !== false;
                if (aEligible !== bEligible) return aEligible ? -1 : 1;

                const aIndex = recommendedMap.has(a.id) ? recommendedMap.get(a.id) : 999999;
                const bIndex = recommendedMap.has(b.id) ? recommendedMap.get(b.id) : 999999;
                
                if (aIndex !== bIndex) return aIndex - bIndex;
                return a.name.localeCompare(b.name);
            });
        } else if (this.sortOrder === 'free_first') {
            this.filteredTools = sortToolsFreeFirst(this.filteredTools);
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
            const card = renderToolCard(tool, this.recommendedIds, 'browse');
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
