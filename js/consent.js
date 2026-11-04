/**
 * WhichAIPick Cookie Consent & Privacy Manager
 * Phase 7 — Google Consent Mode v2 & Certified CMP Architecture (IAB TCF v2.3 Ready)
 *
 * Directive: WhichAIPick MCD v2.0
 *
 * Architecture & Governance:
 *   - Google Consent Mode v2 default-denied signals are set in page <head>
 *     BEFORE any scripts run (ad_storage, analytics_storage, ad_user_data, ad_personalization: 'denied').
 *   - All consent signals default to 'denied' until authoritative certified consent is known.
 *   - Legacy localStorage choices (from uncertified custom banners) are isolated and
 *     CANNOT grant advertising consent or bypass certified CMP evaluation.
 *   - Google Privacy & Messaging (IAB TCF v2.3 certified CMP) is integrated asynchronously
 *     via window.googlefc.callbackQueue and IAB __tcfapi.
 *   - Overlap Prevention: Custom banner is suppressed if Google certified CMP is active or loading.
 *   - Persistent Revocation Trigger: Supported via '#waip-cookie-settings', '[data-waip-consent-manage]',
 *     and 'a[href="#cookie-settings"]'. Delegates to googlefc.showRevocationMessage() when available,
 *     with accessible local dialog fallback if CMP is unavailable.
 *   - AdSense Safety: adsEnabled remains false in data/monetisation.json; no ads are rendered.
 */

(function () {
    'use strict';

    // Skip on admin and internal pages
    if (window.location.pathname.startsWith('/admin') ||
        window.location.pathname === '/submissions.html') {
        return;
    }

    const LEGACY_CONSENT_KEY = 'waip_cookie_consent';
    const PUBLISHER_ID = 'ca-pub-7088331504377019';

    // Internal state tracking
    const state = {
        legacyConsent: localStorage.getItem(LEGACY_CONSENT_KEY), // 'accepted', 'rejected', or null
        authoritativeConsent: null, // 'granted', 'denied', or null
        googleCmpApiReady: false,
        googleCmpDataReady: false,
        googleCmpDetected: false,
        tcfReady: false,
        tcData: null,
        bannerRendered: false
    };

    // ── Google Consent Mode v2 Signal Updates ─────────────────────────────────
    // Updates Google Consent Mode v2 signals via window.gtag.
    // Default is always 'denied' until authoritative consent is received.

    function updateConsentSignals(updates) {
        if (typeof window.gtag !== 'function') return;

        const signals = {
            ad_storage: updates.ad_storage || 'denied',
            analytics_storage: updates.analytics_storage || 'denied',
            ad_user_data: updates.ad_user_data || 'denied',
            ad_personalization: updates.ad_personalization || 'denied'
        };

        window.gtag('consent', 'update', signals);
    }

    // ── Script Loading (Post-Authoritative-Consent Only) ───────────────────────
    function loadAuthorizedScripts(scope) {
        if (window.WAIP_ScriptsLoaded) return;

        // Only load if at least analytics or ads consent is genuinely granted
        if (!scope || (!scope.analytics && !scope.ads)) return;

        window.WAIP_ScriptsLoaded = true;

        // 1. Load Analytics wrapper if analytics consent granted
        if (scope.analytics) {
            try {
                const analyticsScript = document.createElement('script');
                analyticsScript.src = '/js/analytics.js?v=7.0';
                analyticsScript.async = true;
                document.head.appendChild(analyticsScript);
            } catch (e) {
                console.warn('[Consent] Failed to inject analytics.js', e);
            }
        }

        // 2. Load Ad Slot Manager only if ads consent granted
        // Note: ads.js additionally checks data/monetisation.json (adsEnabled) before rendering
        if (scope.ads) {
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

    // ── Authoritative Consent Processing ─────────────────────────────────────

    function processAuthoritativeConsent(consentModeValues) {
        if (!consentModeValues) return;

        state.authoritativeConsent = consentModeValues;

        const isAdsGranted = consentModeValues.ad_storage === 'granted' ||
                             consentModeValues.ad_personalization === 'granted';
        const isAnalyticsGranted = consentModeValues.analytics_storage === 'granted';

        updateConsentSignals({
            ad_storage: isAdsGranted ? 'granted' : 'denied',
            analytics_storage: isAnalyticsGranted ? 'granted' : 'denied',
            ad_user_data: isAdsGranted ? 'granted' : 'denied',
            ad_personalization: isAdsGranted ? 'granted' : 'denied'
        });

        if (isAnalyticsGranted || isAdsGranted) {
            loadAuthorizedScripts({ analytics: isAnalyticsGranted, ads: isAdsGranted });
        }
    }

    // ── Google Privacy & Messaging (Funding Choices) Asynchronous Setup ───────
    // Documented API: https://developers.google.com/funding-choices/fc-api-docs

    window.googlefc = window.googlefc || {};
    window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];

    // Push standard Google FC lifecycle callbacks
    window.googlefc.callbackQueue.push({
        'CONSENT_API_READY': function () {
            state.googleCmpApiReady = true;
            state.googleCmpDetected = true;
            dismissFallbackBannerIfPresent();
        },
        'CONSENT_MODE_DATA_READY': function () {
            state.googleCmpDataReady = true;
            state.googleCmpDetected = true;
            dismissFallbackBannerIfPresent();

            if (typeof window.googlefc.getGoogleConsentModeValues === 'function') {
                const values = window.googlefc.getGoogleConsentModeValues();
                processAuthoritativeConsent(values);
            }
        }
    });

    // ── IAB TCF v2.3 Event Listener ───────────────────────────────────────────
    if (typeof window.__tcfapi === 'function') {
        state.tcfReady = true;
        state.googleCmpDetected = true;
        try {
            window.__tcfapi('addEventListener', 2, function (tcData, success) {
                if (success && tcData) {
                    state.tcData = tcData;
                    if (tcData.eventStatus === 'tcloaded' || tcData.eventStatus === 'useractioncomplete') {
                        dismissFallbackBannerIfPresent();
                        const hasPurpose1 = tcData.purpose && tcData.purpose.consents && tcData.purpose.consents[1];
                        const hasAds = tcData.purpose && tcData.purpose.consents && (tcData.purpose.consents[3] || tcData.purpose.consents[4]);
                        processAuthoritativeConsent({
                            ad_storage: hasAds ? 'granted' : 'denied',
                            analytics_storage: hasPurpose1 ? 'granted' : 'denied',
                            ad_user_data: hasAds ? 'granted' : 'denied',
                            ad_personalization: hasAds ? 'granted' : 'denied'
                        });
                    }
                }
            });
        } catch (e) {
            console.warn('[Consent] TCF API listener error:', e);
        }
    }

    // ── Helper: Detect if Google CMP / TCF is Active or Loading ────────────────
    function isCertifiedCmpActiveOrLoading() {
        if (state.googleCmpDetected || state.googleCmpApiReady || state.googleCmpDataReady || state.tcfReady) {
            return true;
        }
        if (typeof window.__tcfapi === 'function') return true;
        if (window.googlefc && (window.googlefc.CONSENT_API_READY || window.googlefc.controlledDataReady)) return true;
        if (document.querySelector('script[src*="fundingchoicesmessages.google.com"]')) return true;
        return false;
    }

    function dismissFallbackBannerIfPresent() {
        const banner = document.getElementById('waip-consent-banner');
        if (banner) {
            banner.remove();
            state.bannerRendered = false;
        }
    }

    // ── Fallback Preferences & Banner UI ──────────────────────────────────────
    function createBanner(isPreferences) {
        // Prevent banner if Google CMP is active or handling consent (prevent overlapping banners)
        if (!isPreferences && isCertifiedCmpActiveOrLoading()) {
            return;
        }

        const existingBanner = document.getElementById('waip-consent-banner');
        if (existingBanner) {
            const firstInteractive = existingBanner.querySelector('button, a');
            if (firstInteractive) firstInteractive.focus();
            return;
        }

        state.bannerRendered = true;

        const banner = document.createElement('div');
        banner.id = 'waip-consent-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-modal', 'true');
        banner.setAttribute('aria-live', 'polite');
        banner.setAttribute('aria-label', isPreferences ? 'Cookie and Privacy Preferences' : 'Cookie consent');

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
                    We use cookies and third-party services to improve your experience and analyse traffic.
                    Advertising cookies require certified consent and remain disabled by default.
                    Learn more in our
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
                    <button id="waip-consent-accept" aria-label="Accept essential and analytics cookies" type="button"
                        style="background: #f97316; border: 1px solid #f97316; color: #ffffff; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem; transition: background-color 0.2s; box-shadow: 0 0 10px rgba(249, 115, 22, 0.3);">
                        Accept
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
            state.bannerRendered = false;
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
                handleLocalConsent('rejected');
                dismissBanner();
            });
        }

        if (acceptBtn) {
            acceptBtn.addEventListener('mouseenter', () => acceptBtn.style.backgroundColor = '#ea580c');
            acceptBtn.addEventListener('mouseleave', () => acceptBtn.style.backgroundColor = '#f97316');
            acceptBtn.addEventListener('click', () => {
                handleLocalConsent('accepted');
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

        if (rejectBtn) rejectBtn.focus();
    }

    // ── Local Consent Action Handler ──────────────────────────────────────────
    function handleLocalConsent(choice) {
        localStorage.setItem(LEGACY_CONSENT_KEY, choice);
        state.legacyConsent = choice;

        if (choice === 'rejected') {
            updateConsentSignals({
                ad_storage: 'denied',
                analytics_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied'
            });
        } else if (choice === 'accepted') {
            // Local acceptance allows analytics, but advertising signals STRICTLY remain denied
            // until authoritative certified CMP consent is established.
            updateConsentSignals({
                ad_storage: 'denied',
                analytics_storage: 'granted',
                ad_user_data: 'denied',
                ad_personalization: 'denied'
            });
            loadAuthorizedScripts({ analytics: true, ads: false });
        }
    }

    // ── Revocation & Preferences API ──────────────────────────────────────────
    function showPreferences() {
        // 1. If Google Privacy & Messaging CMP is fully ready with showRevocationMessage
        if (window.googlefc && typeof window.googlefc.showRevocationMessage === 'function') {
            window.googlefc.showRevocationMessage();
            return;
        }

        // 2. If Google FC callbackQueue is initialized and CMP is available or loading
        if (window.googlefc && Array.isArray(window.googlefc.callbackQueue) && (state.googleCmpDetected || state.googleCmpApiReady)) {
            window.googlefc.callbackQueue.push(() => {
                if (window.googlefc && typeof window.googlefc.showRevocationMessage === 'function') {
                    window.googlefc.showRevocationMessage();
                } else {
                    createBanner(true);
                }
            });
            return;
        }

        // 3. Fallback: Open WhichAIPick local preferences banner
        createBanner(true);
    }

    function revokeConsent() {
        localStorage.removeItem(LEGACY_CONSENT_KEY);
        state.legacyConsent = null;
        state.authoritativeConsent = null;

        updateConsentSignals({
            ad_storage: 'denied',
            analytics_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
        });

        showPreferences();
    }

    window.WAIP_Consent = {
        showPreferences: showPreferences,
        getConsent: function () {
            return state.authoritativeConsent || state.legacyConsent;
        },
        revokeConsent: revokeConsent,
        isCmpActive: function () {
            return isCertifiedCmpActiveOrLoading();
        }
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

    // ── Initialization (Safe Migration & State Isolation) ─────────────────────
    if (state.legacyConsent === 'rejected') {
        updateConsentSignals({
            ad_storage: 'denied',
            analytics_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
        });
    } else {
        // No decision, or legacy accepted:
        // Default signals remain strictly 'denied' (set in head).
        // If Google CMP is NOT present on the page, show fallback prompt on first visit
        if (!isCertifiedCmpActiveOrLoading() && !state.legacyConsent) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => createBanner(false));
            } else {
                createBanner(false);
            }
        }
    }

})();
