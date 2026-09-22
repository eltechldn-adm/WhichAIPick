/**
 * WhichAIPick — Sponsored Placement Framework
 * Phase 7 — js/sponsored.js
 *
 * Architecture stub for future vendor/sponsored placements.
 * Currently a no-op — all placements are active: false.
 *
 * CRITICAL RULES (enforced in code):
 *   1. Sponsored content is ALWAYS visibly labelled "Sponsored"
 *   2. Sponsored placements are a SEPARATE render path from organic results
 *   3. Payment CANNOT affect Finder scores, comparison rankings, or organic recommendations
 *   4. Sponsor data comes from monetisation.json > sponsoredPlacements only
 *
 * To activate in future:
 *   1. Add a record to sponsoredPlacements in data/monetisation.json
 *   2. Set active: true and provide all required fields
 *   3. Set sponsoredEnabled: true in data/monetisation.json
 */

(function () {
    'use strict';

    window.Sponsored = {
        /**
         * Initialize sponsored placements.
         * Reads from monetisation.json. If sponsoredEnabled=false or no active placements, this is a no-op.
         */
        init: async function () {
            let config;
            try {
                const res = await fetch('/data/monetisation.json');
                if (!res.ok) return;
                config = await res.json();
            } catch {
                return;
            }

            if (!config.sponsoredEnabled || !Array.isArray(config.sponsoredPlacements)) return;

            const activePlacements = config.sponsoredPlacements.filter(p => p.active === true);
            if (!activePlacements.length) return;

            // Future: render visibly-labelled sponsored cards in designated containers
            // Sponsored cards must NEVER be placed inside:
            //   - Finder results (organic scoring)
            //   - Compare table cells
            //   - Shortlist
            //   - Any context that implies editorial endorsement
            console.info('[Sponsored] Active placements found:', activePlacements.length, '— renderer not yet implemented.');
        },

        /**
         * Render a sponsored card (future implementation).
         * Will always include a visible "Sponsored" label.
         */
        _renderCard: function (placement) {
            // Implementation to be completed when first paid campaign is approved
            // Requirements:
            //   - Must display "Sponsored" label, visually distinct from organic cards
            //   - Must use rel="sponsored noopener noreferrer" on outbound links
            //   - Must track with Analytics.track('sponsored_impression', {...}) and ('sponsored_click', {...})
            //   - Must NOT modify tool ratings, scores, or recommendation logic
        }
    };

})();
