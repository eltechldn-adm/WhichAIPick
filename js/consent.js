/**
 * WhichAIPick Cookie Consent & Privacy Manager
 * Phase 7 — Google Consent Mode v2 & Certified CMP Architecture (IAB TCF v2.3 Ready)
 *
 * Architecture:
 *   - Google Consent Mode v2 default-denied signals are set in page <head>
 *     BEFORE this script runs (required by Google).
 *   - This script updates consent signals based on user choice.
 *   - AdSense and analytics scripts load post-consent ONLY.
 *   - ads.js and affiliate.js are loaded post-consent; ads.js additionally checks
 *     data/monetisation.json (adsEnabled) before rendering ad units.
 *
 * Google Certified CMP & IAB TCF v2.3 Integration:
 *   - IAB TCF v2.3 is mandatory for new consent strings in the EEA, UK, and Switzerland
 *     as of March 1, 2026.
 *   - Google's certified CMP (Privacy & messaging in the AdSense console) serves the compliant
 *     TCF v2.3 message and vendor lists.
 *   - Revocation & Preferences Bridge:
 *     If Google Privacy & messaging is active on the page (window.googlefc), this script
 *     delegates preference management and consent revocation directly to
 *     window.googlefc.showRevocationMessage via callback queue.
 *   - Fallback Preferences Dialog:
 *     In testing, pre-activation, or jurisdictions without googlefc, this script provides
 *     a accessible WhichAIPick consent preferences dialog that updates Consent Mode v2
 *     signals ('granted' or 'denied') and manages localStorage state.
 *   - Persistent Triggers:
 *     Global click delegation handles all '#waip-cookie-settings', '[data-waip-consent-manage]',
 *     and 'a[href="#cookie-settings"]' triggers across the site.
 */

(function () {
    'use strict';

    // Skip on admin pages
    if (window.location.pathname.startsWith('/admin') ||
        window.location.pathname === '/submissions.html') {
        return;
    }

    const CONSENT_KEY = 'waip_cookie_consent';
    const PUBLISHER_ID = 'ca-pub-7088331504377019';

    const state = {
        consent: localStorage.getItem(CONSENT_KEY) // 'accepted', 'rejected', or null
    };

    // ── Consent Mode v2 Signal Updates ───────────────────────────────────────
    // Default-denied signals are set in page <head> before this loads.
    // Here we update them based on the stored or newly given consent.

    function updateConsentSignals(choice) {
        if (typeof window.gtag !== 'function') return;

        if (choice === 'accepted') {
            window.gtag('consent', 'update', {
                ad_storage: 'granted',
                analytics_storage: 'granted',
                ad_user_data: 'granted',
                ad_personalization: 'granted'
            });
        } else {
            // Rejected or withdrawn — ensure all remain denied
            window.gtag('consent', 'update', {
                ad_storage: 'denied',
                analytics_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied'
            });
        }
    }

    // ── Script Loading ────────────────────────────────────────────────────────
    // AdSense and tracking scripts are loaded post-consent ONLY.

    function loadScripts() {
        if (window.WAIP_ScriptsLoaded) return;
        window.WAIP_ScriptsLoaded = true;

        // 1. Load Analytics wrapper
        try {
            const analyticsScript = document.createElement('script');
            analyticsScript.src = '/js/analytics.js?v=7.0';
            analyticsScript.async = true;
            document.head.appendChild(analyticsScript);
        } catch (e) {
            console.warn('[Consent] Failed to inject analytics.js', e);
        }

        // 2. Load Ad Slot Manager (manages named ad containers, environment-aware)
        try {
            const adsScript = document.createElement('script');
            adsScript.src = '/js/ads.js?v=7.0';
            adsScript.async = true;
            adsScript.onload = () => {
                if (window.WaipAds) window.WaipAds.init();
            };
            document.head.appendChild(adsScript);
        } catch (e) {
            console.warn('[Consent] Failed to inject ads.js', e);
        }

        // 3. Load Affiliate Routing (environment-aware, architecture-only)
        try {
            const affiliateScript = document.createElement('script');
            affiliateScript.src = '/js/affiliate.js?v=7.0';
            affiliateScript.async = true;
            affiliateScript.onload = () => {
                if (window.Affiliate) window.Affiliate.init();
            };
            document.head.appendChild(affiliateScript);
        } catch (e) {
            console.warn('[Consent] Failed to inject affiliate.js', e);
        }
    }

    // ── Banner & Preferences UI ───────────────────────────────────────────────

    function createBanner(isPreferences) {
        const existingBanner = document.getElementById('waip-consent-banner');
        if (existingBanner) {
            const firstInteractive = existingBanner.querySelector('button, a');
            if (firstInteractive) firstInteractive.focus();
            return;
        }

        const banner = document.createElement('div');
        banner.id = 'waip-consent-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-modal', 'true');
        banner.setAttribute('aria-live', 'polite');
        banner.setAttribute('aria-label', isPreferences ? 'Cookie and Privacy Preferences' : 'Cookie consent');

        // Design system: Deep navy / Charcoal background / Orange accent — matches WhichAIPick MCD v2.0
        Object.assign(banner.style, {
            position: 'fixed',
            bottom: '0',
            left: '0',
            width: '100%',
            backgroundColor: '#0f172a',
            borderTop: '1px solid #1e293b',
            color: '#f8fafc',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            zIndex: '999999',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.5)',
            fontFamily: 'var(--font-family, system-ui, -apple-system, sans-serif)'
        });

        banner.innerHTML = `
            <div style="max-width: 1200px; margin: 0 auto; width: 100%; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; position: relative;">
                <div style="flex: 1 1 300px; font-size: 0.9rem; line-height: 1.6; color: #cbd5e1; padding-right: 32px;">
                    We use cookies and third-party scripts (including Google AdSense and Analytics) to show relevant ads and analyse traffic.
                    Your data is not sold. Learn more in our
                    <a href="/privacy" style="color: #f97316; text-decoration: underline;">Privacy Policy</a> and
                    <a href="/cookies" style="color: #f97316; text-decoration: underline;">Cookie Policy</a>.
                    <span style="font-size: 0.8rem; display: block; margin-top: 4px; color: #94a3b8;">
                        WhichAIPick may earn a commission from some affiliate links at no extra cost to you.
                        See our <a href="/disclosure" style="color: #94a3b8; text-decoration: underline;">Affiliate Disclosure</a>.
                    </span>
                </div>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; flex: 0 0 auto; align-items: center;">
                    <button id="waip-consent-reject" aria-label="Reject non-essential cookies" type="button"
                        style="background: transparent; border: 1px solid #475569; color: #f8fafc; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem; transition: background-color 0.2s;">
                        Reject Non-Essential
                    </button>
                    <button id="waip-consent-accept" aria-label="Accept all cookies" type="button"
                        style="background: #f97316; border: 1px solid #f97316; color: #ffffff; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem; transition: background-color 0.2s; box-shadow: 0 0 10px rgba(249, 115, 22, 0.3);">
                        Accept All
                    </button>
                    <button id="waip-consent-close" aria-label="Close cookie preferences dialog" type="button"
                        style="background: transparent; border: none; color: #94a3b8; font-size: 1.5rem; line-height: 1; cursor: pointer; padding: 4px 8px; border-radius: 4px; position: absolute; right: 0; top: 0;" title="Dismiss without saving changes">
                        &times;
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(banner);

        function dismissBanner() {
            document.removeEventListener('keydown', onKeyDown);
            const el = document.getElementById('waip-consent-banner');
            if (el) el.remove();
        }

        function onKeyDown(e) {
            if (e.key === 'Escape') {
                dismissBanner();
            }
        }

        document.addEventListener('keydown', onKeyDown);

        const rejectBtn = document.getElementById('waip-consent-reject');
        const acceptBtn = document.getElementById('waip-consent-accept');
        const closeBtn  = document.getElementById('waip-consent-close');

        if (rejectBtn) {
            rejectBtn.addEventListener('mouseenter', () => rejectBtn.style.backgroundColor = '#1e293b');
            rejectBtn.addEventListener('mouseleave', () => rejectBtn.style.backgroundColor = 'transparent');
            rejectBtn.addEventListener('click', () => {
                handleConsent('rejected');
                dismissBanner();
            });
        }

        if (acceptBtn) {
            acceptBtn.addEventListener('mouseenter', () => acceptBtn.style.backgroundColor = '#ea580c');
            acceptBtn.addEventListener('mouseleave', () => acceptBtn.style.backgroundColor = '#f97316');
            acceptBtn.addEventListener('click', () => {
                handleConsent('accepted');
                dismissBanner();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('mouseenter', () => closeBtn.style.color = '#ffffff');
            closeBtn.addEventListener('mouseleave', () => closeBtn.style.color = '#94a3b8');
            closeBtn.addEventListener('click', () => {
                dismissBanner();
            });
        }

        // Focus reject button initially for keyboard navigation safety
        if (rejectBtn) rejectBtn.focus();
    }

    // ── Action Handlers ───────────────────────────────────────────────────────

    function handleConsent(choice) {
        localStorage.setItem(CONSENT_KEY, choice);
        state.consent = choice;
        updateConsentSignals(choice);
        if (choice === 'accepted') {
            loadScripts();
        }
    }

    // ── Certified CMP & Preferences API ───────────────────────────────────────

    function showPreferences() {
        // Delegate to Google Privacy & Messaging (IAB TCF v2.3 certified CMP) if present
        if (window.googlefc) {
            if (typeof window.googlefc.showRevocationMessage === 'function') {
                window.googlefc.showRevocationMessage();
                return;
            }
            if (Array.isArray(window.googlefc.callbackQueue)) {
                window.googlefc.callbackQueue.push(() => {
                    if (window.googlefc && typeof window.googlefc.showRevocationMessage === 'function') {
                        window.googlefc.showRevocationMessage();
                    }
                });
                return;
            }
        }
        // Fallback to local WhichAIPick consent preferences banner
        createBanner(true);
    }

    function revokeConsent() {
        localStorage.removeItem(CONSENT_KEY);
        state.consent = null;
        updateConsentSignals('rejected');
        showPreferences();
    }

    window.WAIP_Consent = {
        showPreferences: showPreferences,
        getConsent: function () {
            return state.consent;
        },
        revokeConsent: revokeConsent
    };

    // ── Global Click Delegation for Cookie Settings ───────────────────────────
    document.addEventListener('click', function (e) {
        const trigger = e.target && e.target.closest && e.target.closest(
            '#waip-cookie-settings, [data-waip-consent-manage], a[href="#cookie-settings"], a[href="#privacy-settings"]'
        );
        if (trigger) {
            e.preventDefault();
            if (window.WAIP_Consent && typeof window.WAIP_Consent.showPreferences === 'function') {
                window.WAIP_Consent.showPreferences();
            }
        }
    });

    // ── Initialization ────────────────────────────────────────────────────────

    if (state.consent === 'accepted') {
        updateConsentSignals('accepted');
        loadScripts();
    } else if (state.consent === 'rejected') {
        updateConsentSignals('rejected');
        // Scripts remain uninitialized — non-essential cookies and trackers suppressed
    } else {
        // No choice saved yet — show consent prompt
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => createBanner(false));
        } else {
            createBanner(false);
        }
    }

})();
