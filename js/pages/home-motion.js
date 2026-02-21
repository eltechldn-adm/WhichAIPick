// js/pages/home-motion.js
// Handles scroll-led reveal choreography and light parallax

document.addEventListener('DOMContentLoaded', () => {
    // 1. Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // We still run the observer to toggle the `.in-view` state immediately 
    // even if motions are CSS-disabled, so the content becomes visible.
    initRevealObserver();

    // 2. Init Parallax ONLY if not reduced motion AND on desktop/tablet
    if (!prefersReducedMotion && window.innerWidth > 980) {
        initParallaxLayers();
    }
});

function initRevealObserver() {
    // Select all elements that want to be revealed directly or as staggered children
    const revealElements = document.querySelectorAll('.reveal, .reveal-stagger');

    if (!revealElements.length) return;

    // Set up the IntersectionObserver
    const observerOptions = {
        root: null, // viewport
        rootMargin: '0px 0px -10% 0px', // Trigger slightly before it hits the bottom
        threshold: 0.1 // 10% of the element visible
    };

    const revealCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Add the class that triggers the CSS transition
                entry.target.classList.add('in-view');
                // Unobserve once revealed to keep it static afterwards
                observer.unobserve(entry.target);
            }
        });
    };

    const revealObserver = new IntersectionObserver(revealCallback, observerOptions);

    revealElements.forEach(el => revealObserver.observe(el));

    // EXPORT or hook for dynamic elements (Feature Tools/Categories injecting later)
    window.WhompRevealObserver = revealObserver;
}

function initParallaxLayers() {
    const parallaxLayers = document.querySelectorAll('.parallax-layer');
    if (!parallaxLayers.length) return;

    let latestKnownScrollY = 0;
    let ticking = false;

    // Use requestAnimationFrame for smooth non-blocking transforms
    function onScroll() {
        latestKnownScrollY = window.scrollY;

        if (!ticking) {
            window.requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }

    function updateParallax() {
        // Iterate and apply gentle translateY. 
        // e.g., move it at 20% the speed of scroll
        parallaxLayers.forEach(layer => {
            // Speed factor. Lower = less movement. Negative = moves inverse to scroll.
            let speed = layer.getAttribute('data-parallax-speed') || 0.15;

            // Only calculate if the parent section is roughly in viewport bounds
            const parent = layer.closest('.scene-wrapper') || layer.parentElement;
            const parentRect = parent.getBoundingClientRect();

            // If parent top is below viewport bottom or bottom is above viewport top, skip
            if (parentRect.top > window.innerHeight || parentRect.bottom < 0) return;

            // Calculate distance of section from center of screen to determine offset
            // We want 0 transform when the section is perfectly centered in viewport
            const sectionCenterY = parentRect.top + (parentRect.height / 2);
            const viewportCenterY = window.innerHeight / 2;
            const distanceFromCenter = sectionCenterY - viewportCenterY;

            const translateY = -(distanceFromCenter * parseFloat(speed));

            // Apply transform
            layer.style.transform = `translateY(${translateY}px)`;
        });

        ticking = false;
    }

    // Attach listener
    window.addEventListener('scroll', onScroll, { passive: true });

    // Initial call
    updateParallax();
}
