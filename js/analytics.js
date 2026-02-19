/**
 * WhichAIPick Analytics Wrapper
 * Handles event tracking and integration with analytics providers (Cloudflare/GA4)
 */
(function () {
    'use strict';

    window.Analytics = {
        init: function () {
            console.log('📊 Analytics Initialized');
            // Cloudflare Web Analytics is typically auto-injected via dashboard
            // If using GA4, we would inject the tag here or assume it's in head
        },

        /**
         * Track an event
         * @param {string} eventName - Name of the event (e.g., 'tool_card_click')
         * @param {object} properties - Additional properties (optional)
         */
        track: function (eventName, properties = {}) {
            try {
                // debug log
                // console.log('🔍 Track:', eventName, properties);

                // 1. Send to Cloudflare Web Analytics (if available)
                // Cloudflare auto-tracks page views. Custom events via data-cf-beacon if configured.
                // For now we assume standard integration.

                // 2. Send to GA4 (if available)
                if (typeof window.gtag === 'function') {
                    window.gtag('event', eventName, properties);
                }

                // 3. Custom/Other providers
            } catch (error) {
                console.warn('Analytics tracking failed:', error);
            }
        }
    };

    // Initialize
    window.Analytics.init();

    // Expose helper for HTML attributes
    // Usage: onclick="Analytics.track('click_cta', { location: 'header' })"
})();
