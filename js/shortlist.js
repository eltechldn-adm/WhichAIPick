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
        this.CURRENT_VERSION = 1;
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
            if (!data) return [];
            
            const parsed = JSON.parse(data);
            
            // Migration: if it's an array (old version)
            if (Array.isArray(parsed)) {
                return parsed;
            }
            
            // New version: { version: 1, toolIds: [...] }
            if (parsed && typeof parsed === 'object' && Array.isArray(parsed.toolIds)) {
                return parsed.toolIds;
            }
            
            return [];
        } catch (e) {
            console.warn('Could not read shortlist from localStorage', e);
            return [];
        }
    }

    save() {
        try {
            const data = {
                version: this.CURRENT_VERSION,
                toolIds: this.items
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            this.updateGlobalUI();
            
            // Dispatch a custom event for local page components if needed
            window.dispatchEvent(new CustomEvent('shortlist_updated', { detail: { items: this.items } }));
        } catch (e) {
            console.warn('Could not save shortlist to localStorage', e);
        }
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'shortlist-toast';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.style.cssText = 'position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: var(--color-gray-800); color: var(--color-white); padding: 12px 24px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.5); border: 1px solid var(--color-gray-700); font-size: 0.9rem; pointer-events: none; opacity: 0; transition: opacity 0.3s ease;';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Trigger reflow
        void toast.offsetWidth;
        toast.style.opacity = '1';
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    add(toolId) {
        if (!this.items.includes(toolId)) {
            if (this.items.length >= this.MAX_ITEMS) {
                this.showToast('Your shortlist is full. Remove a tool before adding another.');
                return false;
            }
            this.items.push(toolId);
            this.save();
            if (window.Analytics) Analytics.track('shortlist_added', { toolId });
            return true;
        }
        return false;
    }

    remove(toolId) {
        const index = this.items.indexOf(toolId);
        if (index > -1) {
            this.items.splice(index, 1);
            this.save();
            if (window.Analytics) Analytics.track('shortlist_removed', { toolId });
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
        if (window.Analytics) Analytics.track('shortlist_cleared', {});
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
        
        // Listen for storage events from other tabs
        window.addEventListener('storage', (e) => {
            if (e.key === this.STORAGE_KEY) {
                this.items = this.load();
                this.updateGlobalUI();
                window.dispatchEvent(new CustomEvent('shortlist_updated', { detail: { items: this.items } }));
            }
        });
    }
}

// Initialize globally
window.Shortlist = new ShortlistManager();
