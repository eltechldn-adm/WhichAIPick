/**
 * WhichAIPick Cookie Consent & Script Manager
 * Phase 7 — Google Consent Mode v2 hardened
 *
 * Architecture:
 *   - Google Consent Mode v2 default-denied signals are set in partials/header.html
 *     BEFORE this script runs (required by Google).
 *   - This script updates consent signals based on user choice.
 *   - AdSense is loaded post-consent only (fixes previous double-load issue).
 *   - Analytics (analytics.js) is loaded post-consent only.
 *   - ads.js and affiliate.js are loaded post-consent.
 *   - sponsored.js is always safe to load (it's a no-op when sponsoredEnabled=false).
 *
 * OWNER ACTION REQUIRED — Google-certified TCF CMP:
 *   The custom banner below is NOT complete AdSense UK/EEA compliance for personalised ads.
 *   A Google-certified CMP integrated with IAB TCF is required by Google for eligible 
 *   personalised AdSense ad serving to users in the EEA, UK and Switzerland.
 *   Configure Google's certified CMP using AdSense Privacy & messaging before 
 *   production advertising is enabled.
 *   https://www.google.com/adsense/new/u/0/pub-XXXXXXXX/privacymessaging
 *   Replace XXXXXXXX with your publisher ID: 7088331504377019
 *   Do not enable personalised advertising until the certified CMP flow is implemented.
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
    // Default-denied signals are set in partials/header.html before this loads.
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
    // AdSense is loaded here (post-consent) ONLY.
    // The unconditional <script> tag in page <head> has been removed in Phase 7.

    function loadScripts() {
        if (window.WAIP_ScriptsLoaded) return;
        window.WAIP_ScriptsLoaded = true;

        // 1. AdSense is no longer loaded here. It is now loaded dynamically by js/ads.js 
        // ONLY if monetisation.json dictates adsEnabled === true.

        // 2. Load Analytics wrapper
        try {
            const analyticsScript = document.createElement('script');
            analyticsScript.src = '/js/analytics.js?v=7.0';
            analyticsScript.async = true;
            document.head.appendChild(analyticsScript);
        } catch (e) {
            console.warn('[Consent] Failed to inject analytics.js', e);
        }

        // 3. Load Ad Slot Manager (manages named ad containers, environment-aware)
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

        // 4. Load Affiliate Routing (environment-aware, currently architecture-only)
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

    // ── Banner UI ─────────────────────────────────────────────────────────────

    function createBanner() {
        if (document.getElementById('waip-consent-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'waip-consent-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-live', 'polite');
        banner.setAttribute('aria-label', 'Cookie consent');

        // Design system: Deep navy / Orange accent — matches MCD
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
            <div style="max-width: 1200px; margin: 0 auto; width: 100%; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px;">
                <div style="flex: 1 1 300px; font-size: 0.9rem; line-height: 1.6; color: #cbd5e1;">
                    We use cookies and third-party scripts (including Google AdSense and Analytics) to show relevant ads and analyse traffic.
                    Your data is not sold. Learn more in our
                    <a href="/privacy.html" style="color: #f97316; text-decoration: underline;">Privacy Policy</a> and
                    <a href="/cookies.html" style="color: #f97316; text-decoration: underline;">Cookie Policy</a>.
                    <span style="font-size: 0.8rem; display: block; margin-top: 4px; color: #94a3b8;">
                        WhichAIPick may earn a commission from some affiliate links at no extra cost to you.
                        See our <a href="/affiliate-disclosure.html" style="color: #94a3b8; text-decoration: underline;">Affiliate Disclosure</a>.
                    </span>
                </div>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; flex: 0 0 auto; align-items: center;">
                    <button id="waip-consent-reject" aria-label="Reject non-essential cookies"
                        style="background: transparent; border: 1px solid #475569; color: #f8fafc; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem; transition: background-color 0.2s;">
                        Reject Non-Essential
                    </button>
                    <button id="waip-consent-accept" aria-label="Accept all cookies"
                        style="background: #f97316; border: 1px solid #f97316; color: #ffffff; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem; transition: background-color 0.2s; box-shadow: 0 0 10px rgba(249, 115, 22, 0.3);">
                        Accept All
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(banner);

        // Keyboard: trap focus within banner for accessibility
        const rejectBtn = document.getElementById('waip-consent-reject');
        const acceptBtn = document.getElementById('waip-consent-accept');

        rejectBtn.addEventListener('mouseenter', () => rejectBtn.style.backgroundColor = '#1e293b');
        rejectBtn.addEventListener('mouseleave', () => rejectBtn.style.backgroundColor = 'transparent');
        acceptBtn.addEventListener('mouseenter', () => acceptBtn.style.backgroundColor = '#ea580c');
        acceptBtn.addEventListener('mouseleave', () => acceptBtn.style.backgroundColor = '#f97316');

        rejectBtn.addEventListener('click', () => { handleConsent('rejected'); banner.remove(); });
        acceptBtn.addEventListener('click', () => { handleConsent('accepted'); banner.remove(); });

        // Initial focus for keyboard users
        rejectBtn.focus();
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

    // ── Public API ────────────────────────────────────────────────────────────

    window.WAIP_Consent = {
        showPreferences: createBanner,
        getConsent: () => state.consent,
        revokeConsent: () => {
            localStorage.removeItem(CONSENT_KEY);
            updateConsentSignals('rejected');
            createBanner();
        }
    };

    // ── Initialization ────────────────────────────────────────────────────────

    if (state.consent === 'accepted') {
        updateConsentSignals('accepted');
        loadScripts();
    } else if (state.consent === 'rejected') {
        updateConsentSignals('rejected');
        // Scripts not loaded — consent denied
    } else {
        // No choice yet — show banner
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createBanner);
        } else {
            createBanner();
        }
    }

})();
