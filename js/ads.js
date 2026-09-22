/**
 * WhichAIPick — Ad Slot Manager
 * Phase 7 — js/ads.js
 *
 * Environment-aware, config-driven AdSense ad slot renderer.
 *
 * Rules:
 *   - Only activates when monetisation.json adsEnabled = true
 *   - Never renders on excluded paths (Finder, Shortlist, legal pages, etc.)
 *   - Uses named slot containers: <div data-ad-slot="slot-name">
 *   - Lazy-loads below-fold slots via IntersectionObserver
 *   - Reserves expected space to minimise CLS
 *   - Never renders inside Finder questions, Compare table cells, or Shortlist
 *
 * OWNER ACTION REQUIRED:
 *   1. Populate adUnits in data/monetisation.json with real AdSense ad unit IDs
 *   2. Set adsEnabled: true in data/monetisation.json
 *   3. Configure your Google CMP via AdSense Privacy & Messaging for UK/EEA consent
 *
 * This script is loaded post-consent via js/consent.js.
 * Do NOT load this script unconditionally in the page <head>.
 */

(function () {
    'use strict';

    let _config = null;
    let _initialized = false;

    // Paths where ads are NEVER shown, regardless of config
    const HARD_EXCLUDED_PATHS = [
        '/find.html',
        '/shortlist/',
        '/about.html',
        '/review-methodology.html',
        '/editorial-policy.html',
        '/affiliate-disclosure.html',
        '/pricing-accuracy-policy.html',
        '/corrections-policy.html',
        '/data-transparency.html',
        '/privacy.html',
        '/terms.html',
        '/cookies.html',
        '/accessibility.html',
        '/contact.html',
        '/submit-tool.html',
        '/report-misuse.html',
        '/disclosure.html',
        '/admin/',
    ];

    function _isExcludedPath(pathname) {
        return HARD_EXCLUDED_PATHS.some(p => pathname.startsWith(p));
    }

    function _isPreviewEnvironment() {
        const host = window.location.hostname;
        return host.includes('.pages.dev') || host === 'localhost' || host === '127.0.0.1';
    }

    async function _loadConfig() {
        if (_config) return _config;
        try {
            const res = await fetch('/data/monetisation.json');
            if (res.ok) _config = await res.json();
            else _config = {};
        } catch {
            _config = {};
        }
        return _config;
    }

    function _createAdContainer(slotName, unitId, publisherId) {
        const wrapper = document.createElement('div');
        wrapper.className = 'waip-ad-container';
        wrapper.setAttribute('aria-label', 'Advertisement');
        wrapper.setAttribute('role', 'complementary');

        // Label
        const label = document.createElement('div');
        label.className = 'waip-ad-label';
        label.textContent = 'Advertisement';
        label.setAttribute('aria-hidden', 'true');
        wrapper.appendChild(label);

        // AdSense slot
        const ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'block';
        ins.setAttribute('data-ad-client', publisherId);
        ins.setAttribute('data-ad-slot', unitId);
        ins.setAttribute('data-ad-format', 'auto');
        ins.setAttribute('data-full-width-responsive', 'true');
        wrapper.appendChild(ins);

        return wrapper;
    }

    function _renderSlot(container, slotName, unitId, publisherId) {
        if (container.dataset.adRendered === 'true') return;
        container.dataset.adRendered = 'true';

        const adContainer = _createAdContainer(slotName, unitId, publisherId);
        container.appendChild(adContainer);

        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.warn('[Ads] AdSense push failed for slot:', slotName, e);
        }
    }

    function _initSlots(config) {
        const publisherId = config.adsensePublisherId;
        const adUnits = config.adUnits || {};
        const pathname = window.location.pathname;

        // Hard exclusion check
        if (_isExcludedPath(pathname)) return;

        // Preview safety: only render if previewAdsEnabled is explicitly true
        if (_isPreviewEnvironment() && !config.previewAdsEnabled) {
            console.info('[Ads] Preview environment detected. Set previewAdsEnabled: true in monetisation.json to test ad layout.');
            return;
        }

        const containers = document.querySelectorAll('[data-ad-slot]');
        if (!containers.length) return;

        // Load the AdSense library dynamically now that we are confirmed eligible
        if (!document.querySelector('script[src*="adsbygoogle.js"]')) {
            try {
                const adSenseScript = document.createElement('script');
                adSenseScript.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
                adSenseScript.async = true;
                adSenseScript.crossOrigin = 'anonymous';
                document.head.appendChild(adSenseScript);
            } catch (e) {
                console.warn('[Ads] Failed to inject adsbygoogle.js', e);
            }
        }

        // Use IntersectionObserver for lazy loading where supported
        const supportsIO = 'IntersectionObserver' in window;
        const observer = supportsIO
            ? new IntersectionObserver((entries, obs) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const el = entry.target;
                        const slotName = el.dataset.adSlot;
                        const unitId = adUnits[slotName];
                        if (unitId) {
                            _renderSlot(el, slotName, unitId, publisherId);
                        }
                        obs.unobserve(el);
                    }
                });
            }, { rootMargin: '200px' })
            : null;

        containers.forEach(container => {
            const slotName = container.dataset.adSlot;

            // Safety: never render inside Finder, Shortlist, or Compare table cells
            if (container.closest('#finder-app, .shortlist-container, .compare-table, .compare-cell')) {
                return;
            }

            const unitId = adUnits[slotName];
            if (!unitId) {
                // No unit ID yet — show placeholder in development only (never production)
                if (config.previewAdsEnabled) {
                    container.classList.add('waip-ad-active');
                    container.innerHTML = `<div class="waip-ad-placeholder" aria-label="Ad placeholder (${slotName})"><span>Ad slot: ${slotName}</span></div>`;
                }
                return;
            }

            container.classList.add('waip-ad-active');

            if (observer) {
                observer.observe(container);
            } else {
                _renderSlot(container, slotName, unitId, publisherId);
            }
        });
    }

    window.WaipAds = {
        /**
         * Initialize ad slots. Called by consent.js after user consent.
         * Safe to call multiple times — only initializes once.
         */
        init: async function () {
            if (_initialized) return;
            _initialized = true;

            const config = await _loadConfig();

            if (!config.adsEnabled) {
                console.info('[Ads] adsEnabled is false. Ad slots are architecture-only.');
                return;
            }

            if (!config.adsensePublisherId) {
                console.warn('[Ads] No adsensePublisherId configured.');
                return;
            }

            // Wait for DOM ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => _initSlots(config));
            } else {
                _initSlots(config);
            }
        }
    };

})();
