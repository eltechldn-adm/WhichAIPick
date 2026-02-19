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
            const response = await fetch('/partials/header.html?v=2.4hotfix');
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
            const response = await fetch('/partials/footer.html?v=1.7');
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
            loadAnalytics();
        });
    } else {
        injectHeader();
        injectFooter();
        loadAnalytics();
    }

    // Load Analytics Script
    function loadAnalytics() {
        const script = document.createElement('script');
        script.src = '/js/analytics.js?v=5.0';
        script.async = true;
        document.head.appendChild(script);
    }
})();

// Mobile Navigation Dropdown Toggle
(function () {
    'use strict';

    let dropdownsInitialized = false;

    // Initialize mobile dropdown accordion functionality
    function initMobileDropdowns() {
        const isMobile = window.innerWidth <= 1024;

        if (isMobile && !dropdownsInitialized) {
            const navDropdowns = document.querySelectorAll('.nav-item-dropdown');

            navDropdowns.forEach(dropdown => {
                const navLink = dropdown.querySelector('.nav-link');

                if (navLink && !navLink.hasAttribute('data-mobile-listener')) {
                    // Mark as initialized
                    navLink.setAttribute('data-mobile-listener', 'true');

                    // Prevent default link behavior on mobile for dropdown parents
                    navLink.addEventListener('click', (e) => {
                        e.preventDefault();

                        // Toggle active class
                        dropdown.classList.toggle('active');

                        // Update aria-expanded attribute
                        const isExpanded = dropdown.classList.contains('active');
                        navLink.setAttribute('aria-expanded', isExpanded);
                    });
                }
            });

            // Initialize Hamburger Menu Toggle
            const toggleBtn = document.querySelector('.mobile-menu-toggle');
            const mainNav = document.querySelector('.main-nav');

            if (toggleBtn && mainNav && !toggleBtn.hasAttribute('data-init')) {
                toggleBtn.setAttribute('data-init', 'true');

                toggleBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const isExpanded = toggleBtn.classList.toggle('active');
                    mainNav.classList.toggle('nav-open');
                    toggleBtn.setAttribute('aria-expanded', isExpanded);
                });
            }

            dropdownsInitialized = true;
        } else if (!isMobile && dropdownsInitialized) {
            // Reset on desktop
            const navDropdowns = document.querySelectorAll('.nav-item-dropdown');
            navDropdowns.forEach(dropdown => {
                dropdown.classList.remove('active');
                const navLink = dropdown.querySelector('.nav-link');
                if (navLink) {
                    navLink.setAttribute('aria-expanded', 'false');
                    navLink.removeAttribute('data-mobile-listener');
                }
            });

            // Reset hamburger
            const toggleBtn = document.querySelector('.mobile-menu-toggle');
            const mainNav = document.querySelector('.main-nav');
            if (toggleBtn) {
                toggleBtn.classList.remove('active');
                toggleBtn.setAttribute('aria-expanded', 'false');
            }
            if (mainNav) {
                mainNav.classList.remove('nav-open');
            }

            dropdownsInitialized = false;
        }
    }

    // Wait for header to be injected before initializing
    function waitForHeader() {
        const checkHeader = setInterval(() => {
            const header = document.querySelector('.site-header .main-nav');
            if (header) {
                clearInterval(checkHeader);
                initMobileDropdowns();
            }
        }, 100);

        // Timeout after 3 seconds
        setTimeout(() => clearInterval(checkHeader), 3000);
    }

    // Initialize after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForHeader);
    } else {
        waitForHeader();
    }

    // Re-initialize on resize (debounced)
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(initMobileDropdowns, 200);
    });
})();
