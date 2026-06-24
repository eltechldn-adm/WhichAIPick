/**
 * WhichAIPick Cookie Consent & Script Manager
 * Handles GDPR-compliant loading of AdSense and Analytics
 */

(function () {
    'use strict';

    // Do not run on admin pages
    if (window.location.pathname.startsWith('/admin') || window.location.pathname === '/submissions.html') {
        return;
    }

    const CONSENT_KEY = 'waip_cookie_consent';

    // State management
    const state = {
        consent: localStorage.getItem(CONSENT_KEY) // 'accepted', 'rejected', or null
    };

    // --- Script Injection ---
    function loadScripts() {
        // Prevent duplicate loading
        if (window.WAIP_ScriptsLoaded) return;
        window.WAIP_ScriptsLoaded = true;

        // 1. Load Analytics
        try {
            const analyticsScript = document.createElement('script');
            analyticsScript.src = '/js/analytics.js?v=5.0';
            analyticsScript.async = true;
            document.head.appendChild(analyticsScript);
        } catch (e) {
            console.warn('Failed to inject analytics.js', e);
        }

        // 2. Load AdSense
        try {
            const adSenseScript = document.createElement('script');
            adSenseScript.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7088331504377019';
            adSenseScript.async = true;
            adSenseScript.crossOrigin = 'anonymous';
            document.head.appendChild(adSenseScript);
        } catch (e) {
            console.warn('Failed to inject adsbygoogle.js', e);
        }
    }

    // --- Banner UI ---
    function createBanner() {
        if (document.getElementById('waip-consent-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'waip-consent-banner';
        
        // Match WhichAIPick design system (Dark navy / Charcoal background, Orange accent)
        banner.style.position = 'fixed';
        banner.style.bottom = '0';
        banner.style.left = '0';
        banner.style.width = '100%';
        banner.style.backgroundColor = '#0f172a'; // Deep navy
        banner.style.borderTop = '1px solid #1e293b';
        banner.style.color = '#f8fafc'; // White text
        banner.style.padding = '16px 24px';
        banner.style.display = 'flex';
        banner.style.flexDirection = 'column';
        banner.style.gap = '16px';
        banner.style.zIndex = '999999';
        banner.style.boxShadow = '0 -4px 20px rgba(0, 0, 0, 0.5)';
        banner.style.fontFamily = 'var(--font-family, system-ui, -apple-system, sans-serif)';

        banner.innerHTML = `
            <div style="max-width: 1200px; margin: 0 auto; width: 100%; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px;">
                <div style="flex: 1 1 300px; font-size: 0.95rem; line-height: 1.5; color: #cbd5e1;">
                    We use cookies and third-party scripts (like Google AdSense and Analytics) to personalize content, show relevant ads, and analyze our traffic. 
                    You can manage your preferences below. Learn more in our <a href="/privacy.html" style="color: #f97316; text-decoration: underline;">Privacy Policy</a> and <a href="/cookies.html" style="color: #f97316; text-decoration: underline;">Cookie Policy</a>.
                </div>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; flex: 0 0 auto;">
                    <button id="waip-consent-reject" style="background: transparent; border: 1px solid #475569; color: #f8fafc; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">Reject Non-Essential</button>
                    <button id="waip-consent-accept" style="background: #f97316; border: 1px solid #f97316; color: #ffffff; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 0 10px rgba(249, 115, 22, 0.3);">Accept All</button>
                </div>
            </div>
        `;

        document.body.appendChild(banner);

        // Hover effects
        const rejectBtn = document.getElementById('waip-consent-reject');
        const acceptBtn = document.getElementById('waip-consent-accept');

        rejectBtn.addEventListener('mouseenter', () => rejectBtn.style.backgroundColor = '#1e293b');
        rejectBtn.addEventListener('mouseleave', () => rejectBtn.style.backgroundColor = 'transparent');
        
        acceptBtn.addEventListener('mouseenter', () => acceptBtn.style.backgroundColor = '#ea580c');
        acceptBtn.addEventListener('mouseleave', () => acceptBtn.style.backgroundColor = '#f97316');

        // Events
        rejectBtn.addEventListener('click', () => {
            handleConsent('rejected');
            banner.remove();
        });

        acceptBtn.addEventListener('click', () => {
            handleConsent('accepted');
            banner.remove();
        });
    }

    // --- Action Handlers ---
    function handleConsent(choice) {
        localStorage.setItem(CONSENT_KEY, choice);
        state.consent = choice;
        
        if (choice === 'accepted') {
            loadScripts();
        }
    }

    function showPreferences() {
        createBanner();
    }

    // Expose for "Manage Cookie Preferences" links
    window.WAIP_Consent = {
        showPreferences: showPreferences,
        getConsent: () => state.consent
    };

    // --- Initialization ---
    if (state.consent === 'accepted') {
        // If already accepted, load tracking immediately
        loadScripts();
    } else if (state.consent === null) {
        // If no choice made, show banner when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createBanner);
        } else {
            createBanner();
        }
    }
    // If 'rejected', we do nothing. Scripts are not loaded.

})();
