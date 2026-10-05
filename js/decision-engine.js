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
