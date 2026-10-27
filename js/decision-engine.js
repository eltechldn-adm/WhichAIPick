export class DecisionEngine {
    constructor() {}

    evaluateCriterion(tool, criteriaType, preference) {
        if (!preference || preference === 'no_preference') return 'NOT APPLICABLE';

        switch (criteriaType) {
            case 'goal': {
                // Check finderIntentIds first, then primaryUseCases, then primaryCategory
                const intents = tool.finderIntentIds || [];
                const useCases = tool.primaryUseCases || [];
                if (intents.includes(preference)) return 'CONFIRMED MATCH';
                if (useCases.includes(preference)) return 'CONFIRMED MATCH';
                if (tool.primaryCategory === preference) return 'CONFIRMED MATCH';
                return 'CONFIRMED MISMATCH';
            }

            case 'experience': {
                if (!tool.experienceLevel) return 'UNKNOWN';
                if (tool.experienceLevel === 'all_levels') return 'CONFIRMED MATCH';
                if (tool.experienceLevel.toLowerCase() === preference.toLowerCase()) return 'CONFIRMED MATCH';
                return 'CONFIRMED MISMATCH';
            }

            case 'budget': {
                if (preference === 'free_plan') {
                    if (tool.hasFreeTier === true) return 'CONFIRMED MATCH';
                    if (tool.hasFreeTier === false) return 'CONFIRMED MISMATCH';
                    return 'UNKNOWN';
                }
                return 'NOT APPLICABLE';
            }

            case 'technical': {
                if (preference === 'api') {
                    if (tool.apiAvailable === true) return 'CONFIRMED MATCH';
                    if (tool.apiAvailable === false) return 'CONFIRMED MISMATCH';
                    return 'UNKNOWN';
                }
                if (preference === 'open_source') {
                    if (tool.openSource === true) return 'CONFIRMED MATCH';
                    if (tool.openSource === false) return 'CONFIRMED MISMATCH';
                    return 'UNKNOWN';
                }
                if (preference === 'self_hosted') {
                    if (tool.selfHosted === true) return 'CONFIRMED MATCH';
                    if (tool.selfHosted === false) return 'CONFIRMED MISMATCH';
                    return 'UNKNOWN';
                }
                return 'NOT APPLICABLE';
            }
        }
        return 'NOT APPLICABLE';
    }

    evaluateTool(tool, preferences) {
        const matches = [];
        const mismatches = [];
        const unknowns = [];

        for (const [criteriaType, pref] of Object.entries(preferences)) {
            if (!pref || !pref.value || pref.value === 'no_preference') continue;

            const status = this.evaluateCriterion(tool, criteriaType, pref.value);

            const labelStr = pref.label || pref.value;
            if (status === 'CONFIRMED MATCH') matches.push({ type: criteriaType, text: labelStr });
            if (status === 'CONFIRMED MISMATCH') mismatches.push({ type: criteriaType, text: labelStr });
            if (status === 'UNKNOWN') unknowns.push({ type: criteriaType, text: labelStr });
        }

        return { tool, matches, mismatches, unknowns };
    }

    buildExplanationModel(selectedTools, preferences) {
        const evaluations = selectedTools.map(tool => this.evaluateTool(tool, preferences));

        // 1. Evaluate ALL tools to find the strongest candidate(s)
        let maxMatches = -1;
        evaluations.forEach(e => {
            if (e.matches.length > maxMatches) maxMatches = e.matches.length;
        });

        let minMismatches = Infinity;
        const maxMatchEvaluations = evaluations.filter(e => e.matches.length === maxMatches);
        maxMatchEvaluations.forEach(e => {
            if (e.mismatches.length < minMismatches) minMismatches = e.mismatches.length;
        });

        const overallTopCandidates = maxMatchEvaluations.filter(e => e.mismatches.length === minMismatches && e.matches.length > 0);

        let resultType = 'NO CLEAR MATCH';
        let topCandidateIds = overallTopCandidates.map(e => e.tool.id);
        let recommendedToolId = null;

        const allZeroMatches = evaluations.every(e => e.matches.length === 0);
        const allZeroMismatches = evaluations.every(e => e.mismatches.length === 0);

        if (allZeroMatches) {
            if (allZeroMismatches && evaluations.some(e => e.unknowns.length > 0)) {
                resultType = 'INSUFFICIENT CONFIRMED DATA';
            } else {
                resultType = 'NO CLEAR MATCH';
            }
        } else if (overallTopCandidates.length > 0) {
            // 2. Apply recommendation eligibility logic AFTER finding the true best fits
            const eligibleTops = overallTopCandidates.filter(e => e.tool.recommendationEligible !== false);
            const restrictedTops = overallTopCandidates.filter(e => e.tool.recommendationEligible === false);

            if (eligibleTops.length === 0 && restrictedTops.length > 0) {
                // Restricted is the strongest, no eligible tie
                resultType = 'RECOMMENDATION RESTRICTED';
            } else if (eligibleTops.length > 0 && restrictedTops.length > 0) {
                // Tie between eligible and restricted
                resultType = 'CLOSE MATCH / MULTIPLE FITS';
            } else if (eligibleTops.length === 1) {
                // One clear eligible winner
                resultType = 'CLEAR MATCH';
                recommendedToolId = eligibleTops[0].tool.id;
            } else if (eligibleTops.length > 1) {
                // Multiple eligible winners
                resultType = 'CLOSE MATCH / MULTIPLE FITS';
            }
        }

        return {
            resultType,
            topCandidateIds,
            recommendedToolId,
            evaluations
        };
    }

    /**
     * Catalogue-wide discovery (Phase 6B.3B). Pure and deterministic; returns data only.
     *
     * Pool: records that are directoryEligible, recommendationEligible, current
     * (active lifecycle, no successor, not an alias of another record) and not excluded.
     *
     * Hard requirements (a candidate must CONFIRM them; UNKNOWN never satisfies):
     *   - goal (specific goal, or the intents shared by the selected tools when "no preference")
     *   - confirmed free plan, API, open source, self-hosting
     * Experience is a soft preference: it influences ordering only.
     *
     * Ordering (lexicographic, no global score):
     *   1. goal relevance tier (finderIntentIds, then primaryUseCases, then primaryCategory)
     *   2. fewer confirmed mismatches
     *   3. more confirmed matches
     *   4. fewer unknown relevant fields
     *   5. canonical id (stable tie-break, independent of input order)
     */
    discoverMatchingTools({ tools = [], preferences = {}, excludeIds = [], limit = 3, selectedTools = [] } = {}) {
        const goalValue = preferences.goal && preferences.goal.value;
        const goalLabel = (preferences.goal && preferences.goal.label) || goalValue;

        let scopeIntents = null;
        if (!goalValue) {
            return { resultType: 'INSUFFICIENT SCOPE', scopeIntents: [], totalMatches: 0, results: [] };
        }
        if (goalValue === 'no_preference') {
            scopeIntents = this.getSharedIntents(selectedTools);
            if (scopeIntents.length === 0) {
                return { resultType: 'INSUFFICIENT SCOPE', scopeIntents: [], totalMatches: 0, results: [] };
            }
        }

        const excluded = new Set(excludeIds);
        const aliasIds = new Set();
        for (const t of tools) {
            if (Array.isArray(t.aliases)) t.aliases.forEach(a => { if (a !== t.id) aliasIds.add(a); });
        }

        const remaining = {};
        for (const [key, pref] of Object.entries(preferences)) {
            if (key !== 'goal') remaining[key] = pref;
        }
        const hardBudget = remaining.budget && remaining.budget.value === 'free_plan';
        const hardTechnical = remaining.technical &&
            ['api', 'open_source', 'self_hosted'].includes(remaining.technical.value);

        const candidates = [];
        for (const tool of tools) {
            if (!this.isProactivelyEligible(tool, excluded, aliasIds)) continue;

            let goalTier = -1;
            let goalIntentIds = [];
            if (scopeIntents) {
                const intents = tool.finderIntentIds || [];
                goalIntentIds = scopeIntents.filter(i => intents.includes(i));
                if (goalIntentIds.length > 0) goalTier = 0;
            } else if ((tool.finderIntentIds || []).includes(goalValue)) {
                goalTier = 0;
                goalIntentIds = [goalValue];
            } else if ((tool.primaryUseCases || []).includes(goalValue)) {
                goalTier = 1;
            } else if (tool.primaryCategory === goalValue) {
                goalTier = 2;
            }
            if (goalTier < 0) continue;

            if (hardBudget && this.evaluateCriterion(tool, 'budget', 'free_plan') !== 'CONFIRMED MATCH') continue;
            if (hardTechnical && this.evaluateCriterion(tool, 'technical', remaining.technical.value) !== 'CONFIRMED MATCH') continue;

            const evaluation = this.evaluateTool(tool, remaining);
            evaluation.matches.unshift({
                type: 'goal',
                text: scopeIntents ? 'Shared focus of your selected tools' : goalLabel,
                intentIds: goalIntentIds
            });
            candidates.push({ ...evaluation, goalTier });
        }

        candidates.sort((a, b) => {
            if (a.goalTier !== b.goalTier) return a.goalTier - b.goalTier;
            if (a.mismatches.length !== b.mismatches.length) return a.mismatches.length - b.mismatches.length;
            if (a.matches.length !== b.matches.length) return b.matches.length - a.matches.length;
            if (a.unknowns.length !== b.unknowns.length) return a.unknowns.length - b.unknowns.length;
            if (a.tool.id < b.tool.id) return -1;
            return a.tool.id > b.tool.id ? 1 : 0;
        });

        const max = Math.max(0, Math.floor(limit));
        return {
            resultType: candidates.length > 0 ? 'MATCHES FOUND' : 'NO MATCHES FOUND',
            scopeIntents: scopeIntents || [],
            totalMatches: candidates.length,
            results: candidates.slice(0, max).map(({ tool, matches, mismatches, unknowns }) => ({ tool, matches, mismatches, unknowns }))
        };
    }

    isProactivelyEligible(tool, excludedIds, aliasIds) {
        if (!tool || !tool.id) return false;
        if (excludedIds.has(tool.id) || aliasIds.has(tool.id)) return false;
        if (tool.recommendationEligible !== true) return false;
        if (tool.directoryEligible !== undefined && tool.directoryEligible !== true) return false;
        if (tool.operationalStatus && tool.operationalStatus !== 'active') return false;
        if (['discontinued', 'retired', 'defunct', 'shutdown', 'redirect'].includes(tool.lifecycleStatus)) return false;
        if (tool.successorToolId) return false;
        return true;
    }

    getSharedIntents(selectedTools) {
        if (!selectedTools || selectedTools.length === 0) return [];
        const sets = selectedTools.map(t => new Set(t.finderIntentIds || []));
        return Array.from(sets[0]).filter(i => sets.every(s => s.has(i))).sort();
    }

    buildGoalOptions(selectedTools) {
        // 1. Collect finderIntentIds and primaryUseCases
        const toolIntents = selectedTools.map(t => {
            const intents = new Set(t.finderIntentIds || []);
            const useCases = new Set(t.primaryUseCases || []);
            return { id: t.id, intents: Array.from(intents), useCases: Array.from(useCases) };
        });

        // Sort by ID to ensure deterministic output regardless of input order (fairness)
        toolIntents.sort((a, b) => a.id.localeCompare(b.id));

        // 2. Identify shared intents
        const allIntents = new Set();
        toolIntents.forEach(t => t.intents.forEach(i => allIntents.add(i)));

        const sharedIntents = [];
        const uniqueIntents = []; // Array of arrays per tool

        for (const intent of allIntents) {
            let isShared = true;
            for (const t of toolIntents) {
                if (!t.intents.includes(intent)) {
                    isShared = false;
                    break;
                }
            }
            if (isShared) {
                sharedIntents.push(intent);
            }
        }

        toolIntents.forEach(t => {
            const uniques = t.intents.filter(i => !sharedIntents.includes(i));
            uniqueIntents.push(uniques);
        });

        const finalIntents = new Set(sharedIntents);

        // Round-robin for unique intents
        let addedInRound = true;
        let round = 0;
        while (addedInRound && finalIntents.size < 5) {
            addedInRound = false;
            for (let i = 0; i < uniqueIntents.length; i++) {
                if (finalIntents.size >= 5) break;
                if (round < uniqueIntents[i].length) {
                    finalIntents.add(uniqueIntents[i][round]);
                    addedInRound = true;
                }
            }
            round++;
        }

        // If we still need more, fallback to primaryUseCases round-robin
        if (finalIntents.size < 5) {
            const uniqueUseCases = toolIntents.map(t => t.useCases);
            addedInRound = true;
            round = 0;
            while (addedInRound && finalIntents.size < 5) {
                addedInRound = false;
                for (let i = 0; i < uniqueUseCases.length; i++) {
                    if (finalIntents.size >= 5) break;
                    if (round < uniqueUseCases[i].length) {
                        const uc = uniqueUseCases[i][round];
                        if (!finalIntents.has(uc)) {
                            finalIntents.add(uc);
                            addedInRound = true;
                        }
                    }
                }
                round++;
            }
        }

        return Array.from(finalIntents);
    }
}
