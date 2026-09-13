/**
 * shortlist.js
 * 
 * Manages the user's shortlisted AI tools using localStorage.
 * Handles adding/removing tools, and updating UI elements globally.
 */

class ShortlistManager {
    constructor() {
        this.STORAGE_KEY = 'whichaipick_shortlist';
        this.MAX_ITEMS = 10;
        this.items = this.load();
        
        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initUI());
        } else {
            this.initUI();
        }
    }

    load() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.warn('Could not read shortlist from localStorage', e);
            return [];
        }
    }

    save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.items));
            this.updateGlobalUI();
        } catch (e) {
            console.warn('Could not save shortlist to localStorage', e);
        }
    }

    add(toolId) {
        if (!this.items.includes(toolId)) {
            if (this.items.length >= this.MAX_ITEMS) {
                alert(`You can only shortlist up to ${this.MAX_ITEMS} tools. Please remove some before adding more.`);
                return false;
            }
            this.items.push(toolId);
            this.save();
            return true;
        }
        return false;
    }

    remove(toolId) {
        const index = this.items.indexOf(toolId);
        if (index > -1) {
            this.items.splice(index, 1);
            this.save();
            return true;
        }
        return false;
    }

    toggle(toolId) {
        if (this.items.includes(toolId)) {
            this.remove(toolId);
            return false; // Removed
        } else {
            return this.add(toolId); // Added
        }
    }

    clear() {
        this.items = [];
        this.save();
    }

    // Update the header indicator and all active buttons on the page
    updateGlobalUI() {
        const count = this.items.length;
        
        // Update Header Badge
        const badge = document.getElementById('header-shortlist-badge');
        const link = document.getElementById('header-shortlist-link');
        
        if (badge && link) {
            badge.textContent = count;
            if (count > 0) {
                link.style.display = 'inline-flex';
                link.classList.add('has-items');
            } else {
                link.style.display = 'none';
                link.classList.remove('has-items');
            }
        }

        // Update all toggle buttons on the page
        document.querySelectorAll('.shortlist-toggle-btn').forEach(btn => {
            const toolId = btn.getAttribute('data-tool-id');
            if (!toolId) return;

            const isSaved = this.items.includes(toolId);
            if (isSaved) {
                btn.classList.add('saved');
                btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                </svg> Saved`;
            } else {
                btn.classList.remove('saved');
                btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                </svg> Save`;
            }
        });
    }

    initUI() {
        this.updateGlobalUI();

        // Delegate click events for shortlist buttons
        document.body.addEventListener('click', (e) => {
            const btn = e.target.closest('.shortlist-toggle-btn');
            if (btn) {
                e.preventDefault();
                e.stopPropagation(); // Prevent card navigation
                const toolId = btn.getAttribute('data-tool-id');
                if (toolId) {
                    this.toggle(toolId);
                }
            }
        });
    }
}

// Initialize globally
window.Shortlist = new ShortlistManager();
