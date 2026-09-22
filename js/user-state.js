/**
 * WhichAIPick — Unified User State Manager
 * Phase 8 — js/user-state.js
 *
 * Provides a single, versioned local-first store for all user retention data.
 * Replaces whichaipick_shortlist with whichaipick_user_state.
 *
 * State schema:
 * {
 *   version: 1,
 *   savedToolIds: [],       // Tools saved/shortlisted (replaces legacy shortlist)
 *   recentToolIds: [],      // Recently viewed tool IDs — newest first, max 20
 *   savedComparisons: [],   // Array of "tool-a_vs_tool-b" strings (alphabetically sorted IDs)
 *   stackToolIds: [],       // My AI Stack — tools the user currently uses
 *   watchlistToolIds: [],   // Watchlist — tools the user wants to monitor
 *   preferences: {},        // Reserved for future lightweight prefs
 *   firstVisit: <timestamp>,
 *   lastVisit: <timestamp>
 * }
 *
 * Privacy:
 *   - Stored entirely in localStorage (local-first)
 *   - Never transmitted to a server
 *   - User can clear via clearAllData()
 *   - Does NOT touch waip_cookie_consent or Finder session state
 *
 * Migration:
 *   - Reads whichaipick_shortlist (old format)
 *   - Merges valid IDs into savedToolIds
 *   - Transactional: only removes legacy key after verified write
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'whichaipick_user_state';
    const LEGACY_SHORTLIST_KEY = 'whichaipick_shortlist';
    const CURRENT_VERSION = 1;
    const MAX_RECENT = 20;
    const MAX_SAVED = 50;
    const MAX_STACK = 30;
    const MAX_WATCHLIST = 50;

    // ── Default state factory ─────────────────────────────────────────────────

    function createDefaultState() {
        const now = Date.now();
        return {
            version: CURRENT_VERSION,
            savedToolIds: [],
            recentToolIds: [],
            savedComparisons: [],
            stackToolIds: [],
            watchlistToolIds: [],
            preferences: {},
            firstVisit: now,
            lastVisit: now
        };
    }

    // ── Normalisation helpers ─────────────────────────────────────────────────

    function dedupeArray(arr) {
        return [...new Set(arr.filter(id => typeof id === 'string' && id.trim().length > 0))];
    }

    function validateIds(ids, catalogue) {
        if (!catalogue || !catalogue.length) return ids; // Can't validate without catalogue — keep all
        const catalogueSet = new Set(catalogue.map(t => t.id));
        return ids.filter(id => catalogueSet.has(id));
    }

    function canonicalComparison(ids) {
        // Alphabetical sort ensures stable keys regardless of selection order
        return [...ids].sort().join('_vs_');
    }

    // ── Legacy migration ──────────────────────────────────────────────────────

    function readLegacyShortlist() {
        try {
            const raw = localStorage.getItem(LEGACY_SHORTLIST_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.filter(id => typeof id === 'string');
            if (parsed && typeof parsed === 'object' && Array.isArray(parsed.toolIds)) {
                return parsed.toolIds.filter(id => typeof id === 'string');
            }
            return [];
        } catch {
            return [];
        }
    }

    // ── Storage I/O ───────────────────────────────────────────────────────────

    function readState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || parsed.version !== CURRENT_VERSION) {
                return null; // Version mismatch — will create fresh state
            }
            // Ensure all arrays exist (guard against partial corruption)
            return Object.assign(createDefaultState(), parsed);
        } catch {
            return null; // Corrupted — fail safe to fresh state
        }
    }

    function writeState(state) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            return true;
        } catch {
            return false;
        }
    }

    function readBackAndVerify(state) {
        try {
            const readBack = readState();
            if (!readBack) return false;
            // Verify a sample of the data round-tripped correctly
            return readBack.version === state.version &&
                   JSON.stringify(readBack.savedToolIds) === JSON.stringify(state.savedToolIds);
        } catch {
            return false;
        }
    }

    // ── Migration: legacy whichaipick_shortlist ───────────────────────────────

    function migrateLegacyShortlist(state) {
        const legacyIds = readLegacyShortlist();
        if (!legacyIds.length) return; // Nothing to migrate

        // Merge with deduplication — do not duplicate if already present
        const merged = dedupeArray([...state.savedToolIds, ...legacyIds]).slice(0, MAX_SAVED);
        state.savedToolIds = merged;

        // Transactional write: only remove legacy if write + readback succeeds
        const writeOk = writeState(state);
        if (writeOk) {
            const verifyOk = readBackAndVerify(state);
            if (verifyOk) {
                localStorage.removeItem(LEGACY_SHORTLIST_KEY);
                console.info('[UserState] Legacy shortlist migrated:', legacyIds.length, 'tool(s).');
            } else {
                // Write failed verification — retain legacy key for safety
                console.warn('[UserState] Migration write failed readback. Legacy shortlist preserved.');
            }
        }
    }

    // ── Initialise ────────────────────────────────────────────────────────────

    function init() {
        let state = readState();

        if (!state) {
            // Fresh state — attempt to migrate legacy data
            state = createDefaultState();
        }

        migrateLegacyShortlist(state);

        // Track visit
        const isReturn = !!state.lastVisit && (Date.now() - state.lastVisit) > 1000;
        state.lastVisit = Date.now();
        if (!state.firstVisit) state.firstVisit = Date.now();
        writeState(state);

        return { state, isReturn };
    }

    // ── Public API ────────────────────────────────────────────────────────────

    const UserState = {

        _state: null,
        _catalogue: null,

        /**
         * Initialise — call once on page load.
         * Returns { state, isReturn } where isReturn = returning visitor.
         */
        init() {
            const result = init();
            this._state = result.state;
            return result;
        },

        /**
         * Provide the loaded catalogue for ID validation.
         * Call after tools data is loaded.
         */
        setCatalogue(catalogue) {
            this._catalogue = catalogue;
        },

        _get() {
            if (!this._state) this._state = readState() || createDefaultState();
            return this._state;
        },

        _save() {
            writeState(this._state);
            this._broadcastUpdate();
        },

        _broadcastUpdate() {
            window.dispatchEvent(new CustomEvent('userstate_updated', {
                detail: { state: this._state }
            }));
            this._updateHeaderBadge();
        },

        _updateHeaderBadge() {
            const count = this._get().savedToolIds.length;
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
            // Update shortlist-toggle-btn states (for browse cards)
            document.querySelectorAll('.shortlist-toggle-btn[data-tool-id]').forEach(btn => {
                const toolId = btn.getAttribute('data-tool-id');
                if (!toolId) return;
                const isSaved = this._get().savedToolIds.includes(toolId);
                btn.classList.toggle('saved', isSaved);
                btn.setAttribute('aria-label', isSaved ? `Remove ${toolId} from My Tools` : `Save ${toolId} to My Tools`);
                btn.innerHTML = isSaved
                    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg> Saved`
                    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg> Save`;
            });
        },

        _track(event, props) {
            if (window.Analytics) {
                try { window.Analytics.track(event, props || {}); } catch {}
            }
        },

        _showToast(message) {
            const toast = document.createElement('div');
            toast.className = 'waip-toast';
            toast.setAttribute('role', 'alert');
            toast.setAttribute('aria-live', 'assertive');
            toast.textContent = message;
            document.body.appendChild(toast);
            void toast.offsetWidth;
            toast.classList.add('waip-toast--visible');
            setTimeout(() => {
                toast.classList.remove('waip-toast--visible');
                setTimeout(() => toast.remove(), 300);
            }, 2800);
        },

        // ── Saved Tools (Shortlist) ─────────────────────────────────────────

        getSavedTools() { return [...this._get().savedToolIds]; },

        isSaved(toolId) { return this._get().savedToolIds.includes(toolId); },

        save(toolId) {
            const s = this._get();
            if (s.savedToolIds.includes(toolId)) return false;
            if (s.savedToolIds.length >= MAX_SAVED) {
                this._showToast('Saved Tools is full. Remove a tool before adding another.');
                return false;
            }
            s.savedToolIds.push(toolId);
            this._save();
            this._track('tool_saved', { toolId });
            return true;
        },

        unsave(toolId) {
            const s = this._get();
            const i = s.savedToolIds.indexOf(toolId);
            if (i < 0) return false;
            s.savedToolIds.splice(i, 1);
            this._save();
            this._track('tool_unsaved', { toolId });
            return true;
        },

        toggleSave(toolId) {
            return this.isSaved(toolId) ? (this.unsave(toolId), false) : this.save(toolId);
        },

        // ── Recently Viewed ─────────────────────────────────────────────────

        trackRecentView(toolId) {
            const s = this._get();
            // Remove existing entry then prepend (newest first)
            s.recentToolIds = s.recentToolIds.filter(id => id !== toolId);
            s.recentToolIds.unshift(toolId);
            if (s.recentToolIds.length > MAX_RECENT) {
                s.recentToolIds = s.recentToolIds.slice(0, MAX_RECENT);
            }
            this._save();
        },

        getRecentTools() { return [...this._get().recentToolIds]; },

        // ── My AI Stack ─────────────────────────────────────────────────────

        getStack() { return [...this._get().stackToolIds]; },

        isInStack(toolId) { return this._get().stackToolIds.includes(toolId); },

        addToStack(toolId) {
            const s = this._get();
            if (s.stackToolIds.includes(toolId)) return false;
            if (s.stackToolIds.length >= MAX_STACK) {
                this._showToast('Your AI Stack is full. Remove a tool before adding another.');
                return false;
            }
            s.stackToolIds.push(toolId);
            this._save();
            this._track('stack_tool_added', { toolId });
            return true;
        },

        removeFromStack(toolId) {
            const s = this._get();
            const i = s.stackToolIds.indexOf(toolId);
            if (i < 0) return false;
            s.stackToolIds.splice(i, 1);
            this._save();
            this._track('stack_tool_removed', { toolId });
            return true;
        },

        toggleStack(toolId) {
            return this.isInStack(toolId) ? (this.removeFromStack(toolId), false) : this.addToStack(toolId);
        },

        // ── Watchlist ───────────────────────────────────────────────────────

        getWatchlist() { return [...this._get().watchlistToolIds]; },

        isWatched(toolId) { return this._get().watchlistToolIds.includes(toolId); },

        addToWatchlist(toolId) {
            const s = this._get();
            if (s.watchlistToolIds.includes(toolId)) return false;
            if (s.watchlistToolIds.length >= MAX_WATCHLIST) {
                this._showToast('Watchlist is full.');
                return false;
            }
            s.watchlistToolIds.push(toolId);
            this._save();
            this._track('watchlist_added', { toolId });
            return true;
        },

        removeFromWatchlist(toolId) {
            const s = this._get();
            const i = s.watchlistToolIds.indexOf(toolId);
            if (i < 0) return false;
            s.watchlistToolIds.splice(i, 1);
            this._save();
            this._track('watchlist_removed', { toolId });
            return true;
        },

        toggleWatch(toolId) {
            return this.isWatched(toolId) ? (this.removeFromWatchlist(toolId), false) : this.addToWatchlist(toolId);
        },

        // ── Saved Comparisons ───────────────────────────────────────────────

        getSavedComparisons() { return [...this._get().savedComparisons]; },

        isComparisonSaved(ids) {
            if (!Array.isArray(ids) || ids.length < 2) return false;
            const key = canonicalComparison(ids);
            return this._get().savedComparisons.includes(key);
        },

        saveComparison(ids) {
            if (!Array.isArray(ids) || ids.length < 2) return false;
            const key = canonicalComparison(ids);
            const s = this._get();
            if (s.savedComparisons.includes(key)) return false;
            s.savedComparisons.push(key);
            this._save();
            this._track('comparison_saved', { tools: ids.join(',') });
            return true;
        },

        removeComparison(ids) {
            if (!Array.isArray(ids) || ids.length < 2) return false;
            const key = canonicalComparison(ids);
            const s = this._get();
            const i = s.savedComparisons.indexOf(key);
            if (i < 0) return false;
            s.savedComparisons.splice(i, 1);
            this._save();
            this._track('comparison_removed', { tools: ids.join(',') });
            return true;
        },

        toggleComparison(ids) {
            if (!Array.isArray(ids) || ids.length < 2) return false;
            return this.isComparisonSaved(ids) ? (this.removeComparison(ids), false) : this.saveComparison(ids);
        },

        removeComparisonByKey(key) {
            const s = this._get();
            const i = s.savedComparisons.indexOf(key);
            if (i < 0) return false;
            s.savedComparisons.splice(i, 1);
            this._save();
            this._track('comparison_removed', { key });
            return true;
        },

        // ── Stale ID Cleanup ────────────────────────────────────────────────

        /**
         * Validate all stored IDs against the current catalogue.
         * Call once tools data is loaded. Removes stale IDs silently.
         */
        normalise(catalogue) {
            if (!catalogue || !catalogue.length) return;
            this.setCatalogue(catalogue);
            const s = this._get();
            const catalogueSet = new Set(catalogue.map(t => t.id));

            s.savedToolIds = s.savedToolIds.filter(id => catalogueSet.has(id));
            s.recentToolIds = s.recentToolIds.filter(id => catalogueSet.has(id));
            s.stackToolIds = s.stackToolIds.filter(id => catalogueSet.has(id));
            s.watchlistToolIds = s.watchlistToolIds.filter(id => catalogueSet.has(id));
            s.savedComparisons = s.savedComparisons.filter(key => {
                const parts = key.split('_vs_');
                return parts.length >= 2 && parts.every(p => catalogueSet.has(p));
            });

            this._save();
        },

        // ── Returning visitor homepage section ──────────────────────────────

        /**
         * Inject a "Continue Exploring" section on the homepage
         * ONLY when the user has recent tool history.
         * Inserts before the #returning-user-section placeholder.
         */
        renderHomepageReturningSection(allTools) {
            const placeholder = document.getElementById('returning-user-section');
            if (!placeholder) return;

            const recent = this.getRecentTools().slice(0, 6);
            if (!recent.length) return;

            const toolMap = {};
            (allTools || []).forEach(t => { toolMap[t.id] = t; });
            const recentTools = recent.map(id => toolMap[id]).filter(Boolean);
            if (!recentTools.length) return;

            const cards = recentTools.map(t => {
                const initials = (t.name || '??').trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
                const logoHtml = t.logo_url
                    ? `<img class="tool-logo" src="${t.logo_url}" alt="${t.name} logo" width="36" height="36" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="tool-logo-initials" style="display:none">${initials}</div>`
                    : `<div class="tool-logo-initials">${initials}</div>`;
                return `<a href="/tools/${encodeURIComponent(t.id)}/" class="return-tool-card" aria-label="Continue exploring ${t.name}">
                    <div class="tool-logo-wrap">${logoHtml}</div>
                    <div class="return-tool-info">
                        <span class="return-tool-name">${t.name}</span>
                        <span class="return-tool-category">${t.category || ''}</span>
                    </div>
                </a>`;
            }).join('');

            placeholder.innerHTML = `<section class="returning-user-section" aria-label="Continue exploring">
                <div class="section-container">
                    <div class="returning-user-header">
                        <h2>Continue Exploring</h2>
                        <a href="/my-tools/" class="returning-user-link">My Tools →</a>
                    </div>
                    <div class="return-tools-grid">${cards}</div>
                </div>
            </section>`;
            placeholder.hidden = false;

            this._track('return_visit_section_shown', { count: recentTools.length });
        },

        // ── Clear All Data ──────────────────────────────────────────────────

        /**
         * Wipe all WhichAIPick user retention data.
         * Does NOT remove: waip_cookie_consent, whichaipick_quiz_state_v4e3
         */
        clearAllData() {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(LEGACY_SHORTLIST_KEY);
            this._state = createDefaultState();
            writeState(this._state);
            this._broadcastUpdate();
            this._track('personal_state_cleared', {});
        },

        // ── Cross-tab sync ──────────────────────────────────────────────────

        initStorageSync() {
            window.addEventListener('storage', (e) => {
                if (e.key === STORAGE_KEY) {
                    this._state = readState() || createDefaultState();
                    this._broadcastUpdate();
                }
            });
        },

        // ── Click delegation (shortlist-toggle-btn) ─────────────────────────

        initClickDelegation() {
            document.body.addEventListener('click', (e) => {
                const btn = e.target.closest('.shortlist-toggle-btn');
                if (btn) {
                    e.preventDefault();
                    e.stopPropagation();
                    const toolId = btn.getAttribute('data-tool-id');
                    if (toolId) this.toggleSave(toolId);
                }
            });
        },

        // ── Full initialisation (page load) ─────────────────────────────────

        boot() {
            const { isReturn } = this.init();
            if (isReturn) this._track('return_visit', {});
            else this._track('first_visit', {});

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this._updateHeaderBadge();
                    this.initClickDelegation();
                    this.initStorageSync();
                });
            } else {
                this._updateHeaderBadge();
                this.initClickDelegation();
                this.initStorageSync();
            }
        }
    };

    window.UserState = UserState;
    UserState.boot();

    // ── Backwards compatibility shim for window.Shortlist ───────────────────
    // Existing code that calls window.Shortlist.add() / .remove() / .toggle() etc.
    // will continue to work transparently. Remove this shim once all consumers
    // have been confirmed to use window.UserState directly.
    window.Shortlist = {
        get items() { return UserState.getSavedTools(); },
        add(toolId) { return UserState.save(toolId); },
        remove(toolId) { return UserState.unsave(toolId); },
        toggle(toolId) { return UserState.toggleSave(toolId); },
        contains(toolId) { return UserState.isSaved(toolId); },
        clear() { UserState._get().savedToolIds = []; UserState._save(); },
        has(toolId) { return UserState.isSaved(toolId); },
        updateGlobalUI() { UserState._updateHeaderBadge(); }
    };

})();
