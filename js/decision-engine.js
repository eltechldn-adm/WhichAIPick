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
                if (tool.experienceLevel === 'all_levels') return 'CONFIRMED MATCH';
                if (!tool.experienceLevel) return 'UNKNOWN';
                
                if (preference === 'Beginner') {
                    if (tool.experienceLevel === 'beginner') return 'CONFIRMED MATCH';
                    return 'CONFIRMED MISMATCH';
                }
                if (preference === 'Intermediate') {
                    if (tool.experienceLevel === 'intermediate') return 'CONFIRMED MATCH';
                    if (tool.experienceLevel === 'beginner') return 'CONFIRMED MATCH';
                    return 'CONFIRMED MISMATCH';
                }
                if (preference === 'Advanced') {
                    if (tool.experienceLevel === 'advanced') return 'CONFIRMED MATCH';
                    if (tool.experienceLevel === 'intermediate') return 'CONFIRMED MATCH';
                    if (tool.experienceLevel === 'beginner') return 'CONFIRMED MATCH';
                }
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

        let maxMatches = -1;
        let minMismatches = Infinity;

        // Filter out tools that are restricted from being proactive winners
        const eligibleTools = evaluations.filter(e => e.tool.recommendationEligible);

        eligibleTools.forEach(e => {
            if (e.matches.length > maxMatches) maxMatches = e.matches.length;
            // For tools with the same maxMatches, we want the one with fewest mismatches
        });

        // Find min mismatches among those with max matches
        const maxMatchEvaluations = eligibleTools.filter(e => e.matches.length === maxMatches);
        maxMatchEvaluations.forEach(e => {
            if (e.mismatches.length < minMismatches) minMismatches = e.mismatches.length;
        });

        const topCandidates = maxMatchEvaluations.filter(e => e.mismatches.length === minMismatches && e.matches.length > 0);

        let resultType = 'NO CLEAR MATCH';
        
        const allZeroMatches = evaluations.every(e => e.matches.length === 0);
        const allZeroMismatches = evaluations.every(e => e.mismatches.length === 0);

        if (allZeroMatches) {
            if (allZeroMismatches && evaluations.some(e => e.unknowns.length > 0)) {
                resultType = 'INSUFFICIENT CONFIRMED DATA';
            } else {
                resultType = 'NO CLEAR MATCH';
            }
        } else {
            if (topCandidates.length === 1) {
                resultType = 'CLEAR MATCH';
            } else if (topCandidates.length > 1) {
                resultType = 'CLOSE MATCH / MULTIPLE FITS';
            } else if (topCandidates.length === 0 && evaluations.some(e => e.matches.length > 0)) {
                // Meaning the only tool(s) with matches are recommendation-restricted
                resultType = 'RECOMMENDATION RESTRICTED';
            }
        }

        return {
            resultType,
            evaluations
        };
    }
}
