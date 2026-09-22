/**
 * WhichAIPick — Affiliate Routing Module
 * Phase 7 — js/affiliate.js
 *
 * Provides a centralised affiliate URL resolver.
 * Reads from /data/affiliate-links.json (separate from the canonical catalogue).
 *
 * Usage:
 *   const url = await Affiliate.getOutboundUrl(toolId, officialUrl);
 *   const isAffiliate = Affiliate.isAffiliate(toolId);
 *
 * Rules:
 *   - Only returns affiliate URLs when monetisation.affiliateEnabled = true
 *   - Only returns affiliate URLs where status = 'active' (not unverified)
 *   - Falls back to official URL in all other cases
 *   - Never reads affiliate_url from the catalogue (tools.json) — that field is legacy
 */

(function () {
    'use strict';

    let _affiliateLinks = null;
    let _monetisationConfig = null;
    let _loading = false;
    let _loadPromise = null;

    async function _loadData() {
        if (_affiliateLinks && _monetisationConfig) return;
        if (_loadPromise) return _loadPromise;

        _loadPromise = Promise.all([
            fetch('/data/affiliate-links.json').then(r => r.ok ? r.json() : []).catch(() => []),
            fetch('/data/monetisation.json').then(r => r.ok ? r.json() : {}).catch(() => ({}))
        ]).then(([links, config]) => {
            // Filter out the schema reference entry (has _schema key)
            _affiliateLinks = links.filter(l => !l._schema && !l._note);
            _monetisationConfig = config;
        }).catch(err => {
            console.warn('[Affiliate] Failed to load config:', err);
            _affiliateLinks = [];
            _monetisationConfig = {};
        });

        return _loadPromise;
    }

    function _getRecord(toolId) {
        if (!_affiliateLinks) return null;
        return _affiliateLinks.find(l => l.toolId === toolId) || null;
    }

    function _isEnabled() {
        return _monetisationConfig && _monetisationConfig.affiliateEnabled === true;
    }

    window.Affiliate = {
        /**
         * Load affiliate data. Call once on page load if affiliate routing is needed.
         */
        init: async function () {
            await _loadData();
        },

        /**
         * Get the correct outbound URL for a tool.
         * Returns affiliate URL only when:
         *   - affiliateEnabled = true in monetisation.json
         *   - A record for toolId exists with status = 'active'
         * Otherwise returns the official URL.
         *
         * @param {string} toolId - The tool's slug/id
         * @param {string} officialUrl - The tool's canonical website URL
         * @returns {{ url: string, isAffiliate: boolean, network: string|null }}
         */
        getOutboundUrl: async function (toolId, officialUrl) {
            await _loadData();

            if (!_isEnabled()) {
                return { url: officialUrl, isAffiliate: false, network: null };
            }

            const record = _getRecord(toolId);
            if (record && record.status === 'active' && record.affiliateUrl) {
                return {
                    url: record.affiliateUrl,
                    isAffiliate: true,
                    network: record.network || 'direct'
                };
            }

            return { url: officialUrl, isAffiliate: false, network: null };
        },

        /**
         * Synchronous check: is there an active affiliate record for this tool?
         * Only valid after init() has resolved.
         */
        isAffiliate: function (toolId) {
            if (!_isEnabled() || !_affiliateLinks) return false;
            const record = _getRecord(toolId);
            return !!(record && record.status === 'active');
        },

        /**
         * Get appropriate rel attribute string for a link.
         * Affiliate links: rel="sponsored noopener noreferrer"
         * Regular external links: rel="noopener noreferrer"
         */
        getLinkRel: function (isAffiliate) {
            return isAffiliate
                ? 'sponsored noopener noreferrer'
                : 'noopener noreferrer';
        }
    };

})();
