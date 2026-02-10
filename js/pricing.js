// Pricing data management
let pricingData = new Map();
let pricingLoaded = false;

// Load and parse pricing CSV
async function loadPricing() {
    if (pricingLoaded) return;

    try {
        const response = await fetch('data/tool-pricing.csv?v=1.6');
        const text = await response.text();

        // Parse CSV (simple parser for our format)
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',');

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const pricing = {};

            headers.forEach((header, index) => {
                pricing[header.trim()] = values[index]?.trim() || '';
            });

            pricingData.set(pricing.id, pricing);
        }

        pricingLoaded = true;
    } catch (error) {
        console.warn('Pricing data not available:', error);
        pricingLoaded = true; // Mark as loaded even on error to avoid retry
    }
}

// Get pricing for a tool
function getPricingForTool(toolId) {
    const pricing = pricingData.get(toolId);

    if (!pricing) {
        return {
            has_free_tier: 'unknown',
            starting_price: '',
            price_currency: '',
            pricing_model: 'unknown',
            notes: ''
        };
    }

    return pricing;
}

// Format currency with symbol
function formatCurrency(amount, currencyCode) {
    if (!amount) return '';

    const symbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'CAD': 'CA$',
        'AUD': 'A$',
        'JPY': '¥',
        'INR': '₹',
        'CNY': '¥',
        'SEK': 'SEK ',
        'NOK': 'NOK ',
        'DKK': 'DKK '
    };

    const code = currencyCode ? currencyCode.toUpperCase() : '';
    const symbol = symbols[code] || (code ? `${code} ` : '');

    return `${symbol}${amount}`;
}

// Format pricing display
function formatPricing(pricing, tool) {
    const result = {
        freeTier: 'Unknown',
        price: 'Unknown',
        model: ''
    };

    // Helper to create a link if we don't know the value
    const createFallbackLink = (text) => {
        // Use pricing_url if available, else website_url
        const url = (pricing && pricing.pricing_url) ? pricing.pricing_url : (tool ? tool.website_url : '#');
        return `<a href="${url}" target="_blank" rel="noopener" class="pricing-check-btn" style="font-size:inherit; text-decoration:none;">${text}</a>`;
    };

    // Check if we have valid pricing data
    // Condition: pricing object exists AND (has_free_tier is set OR starting_price is set)
    // If has_free_tier is "unknown" (default string) AND starting_price is empty, we consider it missing
    const hasData = pricing && (
        (pricing.has_free_tier !== 'unknown' && pricing.has_free_tier !== undefined) ||
        (pricing.starting_price !== '' && pricing.starting_price !== undefined)
    );

    if (!hasData) {
        // Fallback mode for all missing data
        result.freeTier = createFallbackLink('Check plan');
        result.price = createFallbackLink('Check pricing');
        result.model = ''; // No model to show
        return result;
    }

    // Normal Processing for Free Tier
    if (pricing.has_free_tier === 'true' || pricing.has_free_tier === true || String(pricing.has_free_tier).toLowerCase() === 'yes') {
        result.freeTier = 'Available';
    } else if (pricing.has_free_tier === 'false' || pricing.has_free_tier === false || String(pricing.has_free_tier).toLowerCase() === 'no') {
        result.freeTier = 'Not Available';
    } else {
        result.freeTier = createFallbackLink('Check plan');
    }

    // Normal Processing for Price
    if (pricing.starting_price) {
        result.price = formatCurrency(pricing.starting_price, pricing.price_currency);
    } else if (pricing.pricing_model === 'Freemium' || pricing.pricing_model === 'Free') {
        result.price = 'Free';
    } else {
        result.price = createFallbackLink('Check pricing');
    }

    // Normal Processing for Model
    if (pricing.pricing_model !== 'unknown') {
        result.model = pricing.pricing_model;
    }

    return result;
}
