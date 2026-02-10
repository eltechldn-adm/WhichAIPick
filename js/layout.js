// Layout Injection System
// Injects shared header and footer partials into all pages

(function () {
    'use strict';

    // Update header height CSS variable
    function updateHeaderHeight() {
        // Select the actual injected header element
        const header = document.querySelector('#site-header header.site-header');

        if (header) {
            // Use getBoundingClientRect for accurate height including borders
            const headerHeight = header.getBoundingClientRect().height;
            document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
        }
    }

    // Debounce helper
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Inject header
    async function injectHeader() {
        const headerContainer = document.getElementById('site-header');
        if (!headerContainer) return;

        try {
            const response = await fetch('partials/header.html?v=1.1');
            if (!response.ok) {
                console.warn('Failed to load header partial');
                return;
            }
            const html = await response.text();
            headerContainer.innerHTML = html;

            // Update header height after injection with multiple timing strategies

            // 1. Immediate update after DOM insertion
            requestAnimationFrame(() => {
                updateHeaderHeight();
            });

            // 2. Delayed update to catch layout settling (fonts, etc.)
            setTimeout(() => {
                updateHeaderHeight();
            }, 50);

            // 3. After fonts load (if supported)
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(() => {
                    updateHeaderHeight();
                });
            }

        } catch (error) {
            console.warn('Error injecting header:', error);
        }
    }

    // Inject footer
    async function injectFooter() {
        const footerContainer = document.getElementById('site-footer');
        if (!footerContainer) return;

        try {
            const response = await fetch('partials/footer.html?v=1.1');
            if (!response.ok) {
                console.warn('Failed to load footer partial');
                return;
            }
            const html = await response.text();
            footerContainer.innerHTML = html;
        } catch (error) {
            console.warn('Error injecting footer:', error);
        }
    }

    // Handle resize events (debounced)
    const debouncedUpdateHeight = debounce(updateHeaderHeight, 150);
    window.addEventListener('resize', debouncedUpdateHeight);

    // Initialize on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectHeader();
            injectFooter();
        });
    } else {
        injectHeader();
        injectFooter();
    }
})();
