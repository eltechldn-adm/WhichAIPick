/**
 * WhichAIPick Cookie Consent Logic
 * GDPR/CCPA compliant banner that gates Google AdSense.
 */

(function() {
    'use strict';

    const CONSENT_KEY = 'wap_cookie_consent';
    const ADSENSE_CLIENT_ID = 'ca-pub-7088331504377019';

    window.CookieConsent = {
        init: function() {
            // Only inject the CSS once
            if (!document.getElementById('cookie-consent-css')) {
                const link = document.createElement('link');
                link.id = 'cookie-consent-css';
                link.rel = 'stylesheet';
                link.href = '/css/cookie-consent.css';
                document.head.appendChild(link);
            }

            const consent = localStorage.getItem(CONSENT_KEY);

            if (consent === 'accepted') {
                this.loadAdSense();
            } else if (consent === 'declined') {
                // Do nothing, AdSense stays blocked
            } else {
                this.renderBanner();
            }
        },

        loadAdSense: function() {
            // Prevent double injection
            if (document.querySelector(`script[src*="${ADSENSE_CLIENT_ID}"]`)) {
                return;
            }
            console.log('🍪 Consent granted: Loading AdSense');
            const script = document.createElement('script');
            script.async = true;
            script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
            script.crossOrigin = 'anonymous';
            document.head.appendChild(script);
        },

        renderBanner: function() {
            // Don't render multiple times
            if (document.getElementById('wap-cookie-banner')) return;

            const banner = document.createElement('div');
            banner.id = 'wap-cookie-banner';
            banner.className = 'cookie-banner';
            
            banner.innerHTML = `
                <div class="cookie-content">
                    <div class="cookie-text">
                        <strong>We value your privacy</strong>
                        <p>We use cookies to enhance your browsing experience, serve personalized ads, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies. <a href="/cookies.html">Read our Cookie Policy</a>.</p>
                    </div>
                    <div class="cookie-actions">
                        <button id="cookie-decline" class="btn btn-outline">Decline</button>
                        <button id="cookie-accept" class="btn btn-primary">Accept All</button>
                    </div>
                </div>
            `;

            document.body.appendChild(banner);

            // Add event listeners
            document.getElementById('cookie-accept').addEventListener('click', () => {
                localStorage.setItem(CONSENT_KEY, 'accepted');
                this.closeBanner();
                this.loadAdSense();
            });

            document.getElementById('cookie-decline').addEventListener('click', () => {
                localStorage.setItem(CONSENT_KEY, 'declined');
                this.closeBanner();
            });
        },

        closeBanner: function() {
            const banner = document.getElementById('wap-cookie-banner');
            if (banner) {
                banner.classList.add('hiding');
                setTimeout(() => banner.remove(), 300);
            }
        },

        revoke: function() {
            localStorage.removeItem(CONSENT_KEY);
            alert('Cookie consent revoked. Ad-tracking has been disabled for future page loads.');
            window.location.reload();
        }
    };

    // Auto-init on load if the DOM is ready, otherwise wait
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.CookieConsent.init());
    } else {
        window.CookieConsent.init();
    }
})();
