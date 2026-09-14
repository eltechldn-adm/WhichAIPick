// Find My Tool Quiz Logic - Phase 4E Recommendation Engine

// Persistence Constants
const STORAGE_KEY = 'whichaipick_quiz_state_v4e';
const EXPIRY_DAYS = 7;

// Configuration
const quizConfig = [
    {
        id: 'goal',
        text: "What do you mainly want AI to help with?",
        helper: "This determines the broad category of tools we recommend.",
        options: [
            { text: "Writing & Content", value: "content" },
            { text: "Coding & Development", value: "coding" },
            { text: "Research & Analysis", value: "research" },
            { text: "Image & Video Creation", value: "media" },
            { text: "Productivity & Operations", value: "productivity" },
            { text: "Business & Marketing", value: "business" }
        ]
    },
    {
        id: 'workflow',
        text: "What specific action are you focused on?",
        helper: "Helps us find tools that match your exact use case.",
        options: [
            { text: "Generate original text or copy", value: "generate_text" },
            { text: "Write or debug code", value: "write_code" },
            { text: "Analyse data or documents", value: "analyse_data" },
            { text: "Create or edit images/video", value: "create_media" },
            { text: "Automate repetitive tasks", value: "automate" },
            { text: "Search the web or learn", value: "search_learn" }
        ]
    },
    {
        id: 'budget',
        text: "What is your budget preference?",
        helper: "We'll filter or prioritize based on pricing models.",
        options: [
            { text: "I absolutely need a free option", value: "hard_free" },
            { text: "A free tier is preferred", value: "soft_free" },
            { text: "I'm willing to pay for quality", value: "paid" },
            { text: "Price isn't important", value: "any" }
        ]
    },
    {
        id: 'priority',
        text: "What matters most to you in a tool?",
        options: [
            { text: "Ease of use (Beginner friendly)", value: "ease" },
            { text: "Advanced capability (Powerful features)", value: "advanced" },
            { text: "Broad versatility (All-in-one)", value: "versatile" },
            { text: "Specialist fit (Does one thing perfectly)", value: "specialist" }
        ]
    },
    {
        id: 'context',
        text: "How will you be using this tool?",
        options: [
            { text: "Solo / Personal use", value: "solo" },
            { text: "Team / Business use", value: "team" },
            { text: "Academic / Student", value: "academic" }
        ]
    }
];

// Quiz state
let currentQuestionIndex = 0;
let answers = {};
let allTools = [];

// --- Persistence Helpers ---
function saveQuizState(computedResults = null) {
    const state = {
        answers: answers,
        currentQuestionIndex: currentQuestionIndex,
        resultToolIds: computedResults ? computedResults.map(r => r.tool.id) : [],
        timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function restoreQuizState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;

    try {
        const state = JSON.parse(raw);
        const now = Date.now();
        const maxAge = EXPIRY_DAYS * 24 * 60 * 60 * 1000;

        if (now - state.timestamp > maxAge) {
            localStorage.removeItem(STORAGE_KEY);
            return false;
        }

        answers = state.answers || {};
        currentQuestionIndex = state.currentQuestionIndex || 0;

        if (state.resultToolIds && state.resultToolIds.length > 0) {
            // Wait for tools to load, then reconstruct
            setTimeout(() => showStoredResults(state.resultToolIds), 100);
            return true;
        }

        return true;
    } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
        return false;
    }
}

function resetQuiz() {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
}

// --- Recommendation Engine ---

function calculateToolScore(tool, userAnswers) {
    let score = 0;
    const { goal, workflow, budget, priority, context } = userAnswers;

    // 1. HARD CONSTRAINTS
    if (budget === 'hard_free') {
        const hasFree = (tool.hasFreeTier === true || tool.has_free_tier === true || tool.hasFreeTier === 'Yes');
        if (!hasFree) return -1; // Disqualify
    }
    
    // Eligibility checks (Safety nets)
    if (tool.recommendationEligible !== true) return -1;
    if (tool.contentReviewRequired === true) return -1;
    if (tool.operationalStatus === 'discontinued' || tool.lifecycleStatus === 'discontinued') return -1;
    if (tool.successorToolId) return -1; // If it has a successor, don't recommend the old one

    // 2. SOFT SCORING
    
    // Goal Mapping
    const goalMapping = {
        'content': ['Content Creation', 'Writing'],
        'coding': ['Development', 'Code'],
        'research': ['Research', 'Education'],
        'media': ['Design', 'Video & Audio', 'Image Generation'],
        'productivity': ['Productivity', 'Automation', 'Meetings'],
        'business': ['Business', 'Marketing', 'Sales', 'Customer Support']
    };
    if (goal && goalMapping[goal] && tool.category && goalMapping[goal].includes(tool.category)) {
        score += 5; // Strong primary match
    }

    // Workflow Mapping (Check primaryUseCases)
    const workflowMapping = {
        'generate_text': ['Copywriting', 'Content Creation', 'Writing'],
        'write_code': ['Code Generation', 'Web Development', 'Programming'],
        'analyse_data': ['Data Analysis', 'Document Analysis', 'Research'],
        'create_media': ['Image Generation', 'Video Generation', 'Audio Generation', 'Design'],
        'automate': ['Automation', 'Workflow', 'Productivity'],
        'search_learn': ['Search', 'Education', 'Learning', 'Research']
    };
    if (workflow && workflowMapping[workflow] && Array.isArray(tool.primaryUseCases)) {
        const matches = tool.primaryUseCases.some(uc => workflowMapping[workflow].includes(uc));
        if (matches) score += 4;
    }

    // Budget Preference
    if (budget === 'soft_free') {
        const hasFree = (tool.hasFreeTier === true || tool.has_free_tier === true || tool.hasFreeTier === 'Yes');
        if (hasFree) score += 2;
    }

    // Priority Mapping (Qualitative)
    if (priority === 'ease' && ['Productivity', 'Content Creation', 'Design'].includes(tool.category)) score += 1;
    if (priority === 'advanced' && ['Development', 'Automation', 'Research'].includes(tool.category)) score += 1;
    if (priority === 'versatile' && tool.primaryUseCases && tool.primaryUseCases.length > 3) score += 1;
    if (priority === 'specialist' && tool.primaryUseCases && tool.primaryUseCases.length <= 2) score += 1;

    // Context Mapping
    if (context === 'team' && tool.targetUsers && Array.isArray(tool.targetUsers) && tool.targetUsers.some(u => u.toLowerCase().includes('team') || u.toLowerCase().includes('enterprise'))) {
        score += 2;
    }
    if (context === 'academic' && ['Education', 'Research'].includes(tool.category)) {
        score += 2;
    }

    return score;
}

function generateExplanation(tool, userAnswers) {
    const reasons = [];
    const { goal, workflow, budget } = userAnswers;

    // Workflow reasoning
    const workflowMap = {
        'generate_text': 'generating text and copy',
        'write_code': 'writing and debugging code',
        'analyse_data': 'analysing data and documents',
        'create_media': 'creating visual media',
        'automate': 'automating repetitive tasks',
        'search_learn': 'searching and learning'
    };
    
    if (workflow && workflowMap[workflow]) {
        reasons.push(`Matches your need for ${workflowMap[workflow]}.`);
    } else if (tool.category) {
        reasons.push(`Strong fit in the ${tool.category} category.`);
    }

    // Budget reasoning
    if (budget === 'hard_free' || budget === 'soft_free') {
        const hasFree = (tool.hasFreeTier === true || tool.has_free_tier === true || tool.hasFreeTier === 'Yes');
        if (hasFree) {
            reasons.push(`Offers a verified free tier.`);
        }
    }
    
    // Best For reasoning
    if (tool.bestFor && tool.bestFor.length > 0) {
        reasons.push(`Designed specifically for: ${tool.bestFor[0]}.`);
    }

    return reasons;
}

function generateTradeOff(tool) {
    if (tool.limitations && tool.limitations.length > 0) {
        return tool.limitations[0];
    }
    if (tool.notIdealFor && tool.notIdealFor.length > 0) {
        return `Not ideal for: ${tool.notIdealFor[0]}`;
    }
    if (tool.pricingNeedsReview) {
        return "Pricing structure may have recently changed.";
    }
    return null;
}

async function recommendTools(userAnswers) {
    if (!window.loadTools) {
        console.error("Tool catalog is not available.");
        return [];
    }
    allTools = await window.loadTools();
    
    const validTools = allTools.filter(tool => tool.website_url && tool.category && tool.category !== 'Uncategorized');

    const scoredTools = validTools.map(tool => ({
        tool,
        score: calculateToolScore(tool, userAnswers)
    })).filter(item => item.score > 0); // Must have at least some match

    // Sort by score desc, then name A-Z
    scoredTools.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.tool.name.localeCompare(b.tool.name);
    });
    
    // Result Diversity: If top 2 are same category, try to bump a different category to #2 if scores are close
    if (scoredTools.length > 2) {
        const topCat = scoredTools[0].tool.category;
        const secondCat = scoredTools[1].tool.category;
        if (topCat === secondCat) {
            // Find next highest score with different category within 2 points
            const divIdx = scoredTools.findIndex((item, idx) => idx > 1 && item.tool.category !== topCat && (scoredTools[1].score - item.score <= 2));
            if (divIdx !== -1) {
                // Swap
                const temp = scoredTools[1];
                scoredTools[1] = scoredTools[divIdx];
                scoredTools[divIdx] = temp;
            }
        }
    }

    const topResults = scoredTools.slice(0, 3).map((item, index) => {
        let label = "Strong Fit";
        if (index === 1) label = "Good Alternative";
        if (index === 2) label = "Also Consider";
        
        return {
            tool: item.tool,
            score: item.score,
            label: label,
            reasons: generateExplanation(item.tool, userAnswers),
            tradeOff: generateTradeOff(item.tool)
        };
    });

    return topResults;
}

// --- UI Rendering ---

function initQuiz() {
    if (restoreQuizState()) {
        if (document.getElementById('results-container').style.display === 'block') {
            return;
        }
    } else {
        currentQuestionIndex = 0;
        answers = {};
    }

    renderQuestion();
    updateProgress();
    updateNavigation();
}

function renderQuestion() {
    const container = document.getElementById('question-container');
    if (!container) return;
    
    const question = quizConfig[currentQuestionIndex];
    const currentAnswer = answers[question.id];

    let html = `
        <div class="question" tabindex="-1" id="current-question-container">
            <h2>${question.text}</h2>
            ${question.helper ? `<p class="question-helper">${question.helper}</p>` : ''}
            <div class="answers" role="radiogroup" aria-label="${question.text}">
    `;

    question.options.forEach((option) => {
        const isSelected = currentAnswer === option.value;
        html += `
            <div class="answer-option ${isSelected ? 'selected' : ''}" 
                 data-value="${option.value}"
                 tabindex="0"
                 role="radio"
                 aria-checked="${isSelected}"
                 onclick="window.selectAnswer('${option.value}')"
                 onkeydown="if(event.key==='Enter' || event.key===' '){event.preventDefault(); window.selectAnswer('${option.value}');}">
                ${option.text}
            </div>
        `;
    });

    html += `</div></div>`;
    container.innerHTML = html;
    
    const questionContainer = document.getElementById('current-question-container');
    if (questionContainer) questionContainer.focus();

    if (window.WhompRevealObserver) {
        setTimeout(() => {
            const newQ = container.querySelector('.question');
            if (newQ) {
                newQ.classList.add('reveal');
                window.WhompRevealObserver.observe(newQ);
            }
        }, 50);
    }
}

function selectAnswer(value) {
    const question = quizConfig[currentQuestionIndex];
    answers[question.id] = value;
    saveQuizState();

    const options = document.querySelectorAll('.answer-option');
    options.forEach(option => {
        if (option.dataset.value === value) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });

    updateNavigation();

    if (currentQuestionIndex === 0 && window.Analytics) {
        Analytics.track('finder_started', { answer_value: value });
    } else if (window.Analytics) {
        Analytics.track('finder_question_answered', { question: question.id, value: value });
    }
}

function updateProgress() {
    const progressText = document.getElementById('progress-text');
    const progressFill = document.getElementById('progress-fill');
    if(!progressText || !progressFill) return;
    
    const percentage = ((currentQuestionIndex + 1) / quizConfig.length) * 100;

    progressText.textContent = `Question ${currentQuestionIndex + 1} of ${quizConfig.length}`;
    progressFill.style.width = `${percentage}%`;
}

function updateNavigation() {
    const backBtn = document.getElementById('back-btn');
    const nextBtn = document.getElementById('next-btn');
    if(!backBtn || !nextBtn) return;
    
    const question = quizConfig[currentQuestionIndex];

    backBtn.disabled = currentQuestionIndex === 0;
    
    const hasAnswer = answers[question.id] !== undefined;
    nextBtn.disabled = !hasAnswer;

    if (currentQuestionIndex === quizConfig.length - 1) {
        nextBtn.textContent = 'Get Matches';
    } else {
        nextBtn.textContent = 'Next';
    }
}

function goBack() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
        updateProgress();
        updateNavigation();
        if (window.Analytics) Analytics.track('finder_back');
    }
}

function goNext() {
    if (currentQuestionIndex < quizConfig.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
        updateProgress();
        updateNavigation();
    } else {
        calculateAndShowResults();
    }
}

// --- Results Rendering ---

async function calculateAndShowResults() {
    // Show loading state
    const container = document.getElementById('question-container');
    if(container) container.innerHTML = `<div class="question" style="text-align: center; padding: 3rem 0;"><h2>Finding your best matches...</h2><p class="question-helper">Analyzing tools against your preferences.</p></div>`;
    
    const recommendations = await recommendTools(answers);
    saveQuizState(recommendations);
    renderResultsPage(recommendations);
    
    if (window.Analytics) Analytics.track('finder_completed', { result_count: recommendations.length });
}

async function showStoredResults(resultIds) {
    if (!window.loadTools) return;
    allTools = await window.loadTools();
    const recommendations = [];

    resultIds.forEach((id, index) => {
        const tool = allTools.find(t => t.id === id);
        if (tool) {
            let label = "Strong Fit";
            if (index === 1) label = "Good Alternative";
            if (index === 2) label = "Also Consider";
            
            recommendations.push({
                tool: tool,
                score: 0,
                label: label,
                reasons: generateExplanation(tool, answers),
                tradeOff: generateTradeOff(tool)
            });
        }
    });

    if (recommendations.length === 0) {
        resetQuiz();
        return;
    }

    renderResultsPage(recommendations);
}

function renderResultsPage(recommendations) {
    const quizContainer = document.getElementById('quiz-container');
    const resultsContainer = document.getElementById('results-container');
    if(quizContainer) quizContainer.style.display = 'none';
    if(resultsContainer) resultsContainer.style.display = 'block';

    const toolsContainer = document.getElementById('recommended-tools');
    if(!toolsContainer) return;
    
    if (recommendations.length === 0) {
        toolsContainer.innerHTML = `
            <div class="results-summary" style="text-align: center; border: none; box-shadow: none;">
                <h3>No Strong Matches Found</h3>
                <p>We couldn't find a strong match for those specific preferences in our database right now.</p>
            </div>
        `;
        return;
    }

    let toolsHtml = '';
    
    // Quick Compare Header Action
    const compareIds = recommendations.map(r => r.tool.id).join(',');
    toolsHtml += `
        <div class="results-compare-header">
            <a href="/compare.html?tools=${compareIds}" class="btn btn-secondary btn-sm" onclick="if(window.Analytics) Analytics.track('finder_compare_started');">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"></path>
                </svg>
                Compare Top Results
            </a>
        </div>
    `;
    
    toolsHtml += '<div class="recommended-tools">';

    recommendations.forEach(({ tool, label, reasons, tradeOff }) => {
        const hasFree = (tool.hasFreeTier === true || tool.has_free_tier === true || tool.hasFreeTier === 'Yes');
        const priceBadge = hasFree ? `<span class="badge badge-success tool-price-badge">Our data shows a free tier</span>` : '';
        
        let reasonsHtml = '';
        if (reasons && reasons.length > 0) {
            reasonsHtml = `<ul class="tool-result-reasons">${reasons.map(r => `<li>${r}</li>`).join('')}</ul>`;
        }
        
        let tradeOffHtml = '';
        if (tradeOff) {
            tradeOffHtml = `
                <div class="tool-result-tradeoff">
                    <strong>Keep in mind:</strong> ${tradeOff}
                </div>
            `;
        }

        toolsHtml += `
            <div class="tool-result-card">
                <div class="tool-result-label">${label}</div>
                <h4><a href="/tool.html?id=${encodeURIComponent(tool.id)}">${tool.name}</a></h4>
                <div class="tool-result-category">${tool.category}</div>
                ${priceBadge}
                
                <div class="tool-result-explanation">
                    <strong>Why it fits:</strong>
                    ${reasonsHtml}
                </div>
                
                ${tradeOffHtml}
                
                <div class="tool-result-actions">
                    <a href="/tool.html?id=${encodeURIComponent(tool.id)}" class="btn btn-sm btn-primary">View Tool</a>
                    <button class="btn btn-sm btn-secondary" onclick="window.Shortlist && window.Shortlist.add('${tool.id}'); if(window.Analytics) Analytics.track('finder_tool_saved');">Save to Shortlist</button>
                    <a href="/compare.html?tools=${encodeURIComponent(tool.id)}" class="btn btn-sm btn-secondary">Compare</a>
                </div>
            </div>
        `;
    });
    
    toolsHtml += '</div>';
    toolsContainer.innerHTML = toolsHtml;

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Start over
function startOver() {
    if (window.Analytics) Analytics.track('finder_restarted');
    resetQuiz();
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    initQuiz();
    
    const backBtn = document.getElementById('back-btn');
    const nextBtn = document.getElementById('next-btn');
    const startOverBtn = document.getElementById('start-over-btn');

    if (backBtn) backBtn.addEventListener('click', goBack);
    if (nextBtn) nextBtn.addEventListener('click', goNext);
    if (startOverBtn) startOverBtn.addEventListener('click', startOver);
});

// Globals
window.selectAnswer = selectAnswer;

