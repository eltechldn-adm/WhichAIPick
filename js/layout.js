// Layout Injection System
// Phase 3: Updated for streamlined nav + off-canvas mobile panel

(function () {
    'use strict';

    // Update header height CSS variable
    function updateHeaderHeight() {
        const header = document.querySelector('#site-header header.site-header');
        if (header) {
            const headerHeight = header.getBoundingClientRect().height;
            document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
        }
    }

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

        if (headerContainer.children.length > 0) {
            requestAnimationFrame(() => updateHeaderHeight());
            setTimeout(() => updateHeaderHeight(), 50);
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(() => updateHeaderHeight());
            }
            return;
        }

        try {
            const response = await fetch('/partials/header.html?v=3.0');
            if (!response.ok) {
                console.warn('Failed to load header partial');
                return;
            }
            const html = await response.text();
            headerContainer.innerHTML = html;

            requestAnimationFrame(() => updateHeaderHeight());
            setTimeout(() => updateHeaderHeight(), 50);
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(() => updateHeaderHeight());
            }
        } catch (error) {
            console.warn('Error injecting header:', error);
        }
    }

    // Inject footer
    async function injectFooter() {
        const footerContainer = document.getElementById('site-footer');
        if (!footerContainer) return;
        if (footerContainer.children.length > 0) return;

        try {
            const response = await fetch('/partials/footer.html?v=3.0');
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

    const debouncedUpdateHeight = debounce(updateHeaderHeight, 150);
    window.addEventListener('resize', debouncedUpdateHeight);

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

// Mobile Navigation — Off-Canvas Panel
(function () {
    'use strict';

    let isInitialized = false;

    function initMobileNav() {
        if (isInitialized) return;

        const toggleBtn = document.querySelector('.mobile-menu-toggle');
        const panel = document.querySelector('.mobile-nav-panel');

        if (!toggleBtn || !panel) return;

        isInitialized = true;

        function openPanel() {
            panel.classList.add('nav-open');
            panel.setAttribute('aria-hidden', 'false');
            toggleBtn.classList.add('active');
            toggleBtn.setAttribute('aria-expanded', 'true');
            toggleBtn.setAttribute('aria-label', 'Close navigation menu');
            document.body.style.overflow = 'hidden';

            // Move focus to panel
            const firstLink = panel.querySelector('a, button');
            if (firstLink) {
                setTimeout(() => firstLink.focus(), 50);
            }
        }

        function closePanel() {
            panel.classList.remove('nav-open');
            panel.setAttribute('aria-hidden', 'true');
            toggleBtn.classList.remove('active');
            toggleBtn.setAttribute('aria-expanded', 'false');
            toggleBtn.setAttribute('aria-label', 'Open navigation menu');
            document.body.style.overflow = '';
            toggleBtn.focus();
        }

        toggleBtn.addEventListener('click', () => {
            const isOpen = panel.classList.contains('nav-open');
            if (isOpen) {
                closePanel();
            } else {
                openPanel();
            }
        });

        // Close on Escape key and Focus Trap on Tab
        document.addEventListener('keydown', (e) => {
            if (!panel.classList.contains('nav-open')) return;

            if (e.key === 'Escape') {
                closePanel();
                return;
            }

            if (e.key === 'Tab') {
                const focusableElements = panel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) { // Shift + Tab
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else { // Tab
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (panel.classList.contains('nav-open') &&
                !panel.contains(e.target) &&
                !toggleBtn.contains(e.target)) {
                closePanel();
            }
        });

        // Close if viewport becomes desktop
        const mq = window.matchMedia('(min-width: 1025px)');
        mq.addEventListener('change', (e) => {
            if (e.matches && panel.classList.contains('nav-open')) {
                closePanel();
                document.body.style.overflow = '';
            }
        });
    }

    // Wait for header to be in DOM
    function waitForHeader() {
        const checkHeader = setInterval(() => {
            const panel = document.querySelector('.mobile-nav-panel');
            if (panel) {
                clearInterval(checkHeader);
                initMobileNav();
            }
        }, 80);
        setTimeout(() => clearInterval(checkHeader), 5000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForHeader);
    } else {
        waitForHeader();
    }
})();
