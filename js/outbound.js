/**
 * WhichAIPick — Outbound Click Tracking Module
 * Phase 7 — js/outbound.js
 *
 * Centralises all outbound link tracking.
 * Replaces scattered Analytics.track('tool_outbound_click', ...) calls.
 *
 * Event schema (no PII):
 *   tool_visit           — generic outbound visit
 *   affiliate_click      — confirmed affiliate link click
 *   compare_outbound_click
 *   finder_outbound_click
 *   alternative_outbound_click
 *   best_tools_outbound_click
 *
 * Properties (all anonymous):
 *   toolId         — tool slug
 *   destinationDomain — top-level domain of destination
 *   sourcePageType — 'tool_page'|'browse'|'finder'|'compare'|'shortlist'|'category'|'seo_best_tools'|'seo_alternatives'|'seo_guide'
 *   sourcePage     — window.location.pathname
 *   isAffiliate    — boolean
 *   network        — affiliate network name or null
 */

(function () {
    'use strict';

    function _getDomain(url) {
        try {
            return new URL(url).hostname.replace(/^www\./, '');
        } catch {
            return 'unknown';
        }
    }

    function _getPageType() {
        const path = window.location.pathname;
        if (path.startsWith('/tools/') && path.length > 8) return 'tool_page';
        if (path === '/tools/' || path === '/tools') return 'browse';
        if (path.startsWith('/find')) return 'finder';
        if (path.startsWith('/compare')) return 'compare';
        if (path.startsWith('/shortlist')) return 'shortlist';
        if (path.startsWith('/category')) return 'category';
        if (path.startsWith('/best-ai-tools')) return 'seo_best_tools';
        if (path.startsWith('/alternatives')) return 'seo_alternatives';
        if (path.startsWith('/guides')) return 'seo_guide';
        return 'other';
    }

    window.Outbound = {
        /**
         * Track an outbound click event.
         *
         * @param {object} opts
         * @param {string} opts.toolId       - Tool slug
         * @param {string} opts.url          - Destination URL
         * @param {boolean} [opts.isAffiliate=false] - Whether this is an affiliate link
         * @param {string} [opts.network=null]        - Affiliate network name
         * @param {string} [opts.sourcePageType]      - Override page type detection
         * @param {string} [opts.label]               - Event label override for variant events
         */
        track: function (opts) {
            if (!opts || !opts.url) return;

            const pageType = opts.sourcePageType || _getPageType();
            const isAffiliate = opts.isAffiliate === true;
            const network = opts.network || null;

            // Determine event name
            let eventName = 'tool_visit';
            if (isAffiliate) {
                eventName = 'affiliate_click';
            } else if (pageType === 'compare') {
                eventName = 'compare_outbound_click';
            } else if (pageType === 'finder') {
                eventName = 'finder_outbound_click';
            } else if (pageType === 'seo_alternatives') {
                eventName = 'alternative_outbound_click';
            } else if (pageType === 'seo_best_tools') {
                eventName = 'best_tools_outbound_click';
            }

            // Use label override if provided
            if (opts.label) {
                eventName = opts.label;
            }

            const properties = {
                toolId: opts.toolId || 'unknown',
                destinationDomain: _getDomain(opts.url),
                sourcePageType: pageType,
                sourcePage: window.location.pathname,
                isAffiliate: isAffiliate
            };

            if (network) properties.network = network;

            // Fire via Analytics wrapper (loaded post-consent)
            if (window.Analytics && typeof window.Analytics.track === 'function') {
                window.Analytics.track(eventName, properties);
            }
        },

        /**
         * Convenience: attach click tracking to a link element.
         * @param {HTMLElement} el    - Anchor element
         * @param {object} opts       - Options (same as track())
         */
        attachToLink: function (el, opts) {
            if (!el) return;
            el.addEventListener('click', () => {
                window.Outbound.track(opts);
            });
        }
    };

})();
