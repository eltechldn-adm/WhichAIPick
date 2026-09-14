// Find My Tool Quiz Logic - Phase 4E.3 Recommendation Engine

// Persistence Constants
const STORAGE_KEY = 'whichaipick_quiz_state_v4e3';
const EXPIRY_DAYS = 7;

// Finder Intent Taxonomy (Maps primaryUseCases to exact intent tags)
const INTENT_TAXONOMY = {
    // Writing & Content
    'writing.generate_text': ['copywriting', 'content creation', 'ad copy generation', 'ai writing assistant', 'blog writing'],
    'writing.rewrite': ['rephrasing', 'rewriting', 'paraphrasing'],
    'writing.longform': ['long-form content', 'book writing', 'essay writing'],
    
    // Coding & Development
    'coding.code_generation': ['writing code', 'code generation', 'programming', 'ai powered code editor', 'coding assistant', 'code completion', 'generating code'],
    'coding.debugging': ['debugging code', 'finding bugs', 'code analysis', 'debugging & fixing code', 'explaining codebase'],
    
    // Building Apps & Sites
    'building.ai_app_builder': ['building ai apps', 'building llm applications', 'building nlp applications', 'building custom chatbots'],
    'building.no_code_app': ['no-code development', 'building apps from sheets', 'no code app building', 'building mobile apps without code', 'no code bot builder'],
    'building.website_builder': ['ai website builder', 'visual web development', 'building responsive sites', 'generating websites', 'automated wordpress building', 'building landing pages'],
    
    // Research & Data Analysis
    'research.web_search': ['searching the web', 'answering questions', 'answering complex questions'],
    'research.academic_papers': ['searching scientific literature', 'finding evidence from research papers', 'academic research', 'academic discovery'],
    'research.document_analysis': ['analyzing long documents', 'document analysis', 'pdf analysis'],
    'research.data_analysis': ['data analysis', 'analyzing data sets', 'analyzing spreadsheets', 'analyzing excel files'],
    'research.summarization': ['summarizing articles', 'summarizing long texts'],
    
    // Image Creation
    'image.generate': ['image generation', 'artistic image generation', 'creating ai art'],
    'image.edit': ['image editing', 'ai photo editing', 'photo editing'],
    
    // Video Creation
    'video.generate': ['video generation', 'creating videos', 'text to video'],
    'video.edit': ['video editing', 'video production'],
    'video.avatar': ['ai avatars', 'avatar video generation'],
    
    // Audio / Voice / Music
    'audio.music_generation': ['music generation', 'audio generation', 'generating music'],
    'audio.voice_generation': ['voice generation', 'text to speech', 'voice cloning'],
    
    // Workflow Automation
    'automation.workflow': ['workflow automation', 'automating business workflows', 'automating tasks', 'marketing automation flows', 'open source automation'],
    'automation.app_integration': ['api integration', 'app integration', 'connecting apps', 'connecting multiple apps'],
    
    // Meetings & Transcription
    'meetings.transcription': ['audio transcription', 'meeting transcription', 'transcribing audio'],
    'meetings.notes': ['meeting notes', 'meeting summaries'],
    
    // Education
    'education.teaching': ['grading student work', 'creating lesson plans', 'generating course structures', 'creating educational resources', 'lesson planning'],
    'education.learning': ['learning programming', 'tutoring', 'active recall', 'learning new topics', 'learning medicine', 'studying flashcards']
};

function getToolIntents(tool) {
    const intents = [];
    const useCases = (tool.primaryUseCases || []).map(uc => uc.toLowerCase());
    
    for (const [intentKey, keywords] of Object.entries(INTENT_TAXONOMY)) {
        for (const uc of useCases) {
            const matchingKeyword = keywords.find(kw => uc.includes(kw));
            if (matchingKeyword) {
                intents.push({
                    intent: intentKey,
                    sourcePhrase: uc,
                    matchedKeyword: matchingKeyword
                });
            }
        }
    }
    
    // Deduplicate by intent (keep first match)
    const uniqueIntents = [];
    const seen = new Set();
    for (const i of intents) {
        if (!seen.has(i.intent)) {
            seen.add(i.intent);
            uniqueIntents.push(i);
        }
    }
    return uniqueIntents;
}

// Configuration
const quizConfig = [
    {
        id: 'goal',
        text: "What do you want help with?",
        helper: "This determines the broad category of tools we recommend.",
        options: [
            { text: "Writing & Content", value: "content" },
            { text: "Coding & Development", value: "coding" },
            { text: "Research & Data Analysis", value: "research" },
            { text: "Image Creation", value: "image" },
            { text: "Video Creation", value: "video" },
            { text: "Audio / Voice / Music", value: "audio" },
            { text: "Workflow Automation", value: "automation" },
            { text: "Meetings & Transcription", value: "meetings" },
            { text: "Education & Learning", value: "education" }
        ]
    },
    {
        id: 'workflow',
        text: "What exactly do you want to do?",
        helper: "Helps us find tools that match your exact use case.",
        getOptions: (answers) => {
            const goal = answers.goal;
            switch(goal) {
                case 'content': return [
                    { text: "Generate text and copy", value: "writing.generate_text" },
                    { text: "Rewrite or paraphrase", value: "writing.rewrite" },
                    { text: "Write long-form (books, essays)", value: "writing.longform" }
                ];
                case 'coding': return [
                    { text: "Write or complete code", value: "coding.code_generation" },
                    { text: "Debug or fix code", value: "coding.debugging" },
                    { text: "Build an app with an AI builder", value: "building.ai_app_builder" },
                    { text: "Build an app without coding", value: "building.no_code_app" },
                    { text: "Build a website", value: "building.website_builder" }
                ];
                case 'research': return [
                    { text: "Web research", value: "research.web_search" },
                    { text: "Research papers / evidence", value: "research.academic_papers" },
                    { text: "Document analysis (PDFs)", value: "research.document_analysis" },
                    { text: "Data analysis (Spreadsheets)", value: "research.data_analysis" },
                    { text: "Summarize articles", value: "research.summarization" }
                ];
                case 'image': return [
                    { text: "Image generation", value: "image.generate" },
                    { text: "Image editing", value: "image.edit" }
                ];
                case 'video': return [
                    { text: "Video generation", value: "video.generate" },
                    { text: "Video editing", value: "video.edit" },
                    { text: "Avatar video generation", value: "video.avatar" }
                ];
                case 'audio': return [
                    { text: "Music generation", value: "audio.music_generation" },
                    { text: "Voice generation / TTS", value: "audio.voice_generation" }
                ];
                case 'automation': return [
                    { text: "Automate app/business workflows", value: "automation.workflow" },
                    { text: "App integration", value: "automation.app_integration" }
                ];
                case 'meetings': return [
                    { text: "Meeting transcription", value: "meetings.transcription" },
                    { text: "Meeting notes", value: "meetings.notes" }
                ];
                case 'education': return [
                    { text: "Lesson planning & grading", value: "education.teaching" },
                    { text: "Tutoring & studying", value: "education.learning" }
                ];
                default: return [];
            }
        }
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
        id: 'specialist',
        text: "What kind of match do you prefer?",
        options: [
            { text: "Specialist for this exact task", value: "specialist" },
            { text: "Open to broader tools that also do this task", value: "broad" }
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
            showStoredResults(state.resultToolIds);
            return true;
        }

        renderQuestion();
        updateProgress();
        updateNavigation();
        return true;
    } catch(e) {
        localStorage.removeItem(STORAGE_KEY);
        return false;
    }
}

function resetQuiz() {
    localStorage.removeItem(STORAGE_KEY);
    answers = {};
    currentQuestionIndex = 0;
    
    const quizContainer = document.getElementById('quiz-container');
    const resultsContainer = document.getElementById('results-container');
    if(quizContainer) quizContainer.style.display = 'block';
    if(resultsContainer) resultsContainer.style.display = 'none';

    renderQuestion();
    updateProgress();
    updateNavigation();
}

// --- Scoring & Recommendation Engine ---

async function recommendTools(userAnswers) {
    if (!window.loadTools) {
        console.error("Tool catalog is not available.");
        return [];
    }
    
    allTools = await window.loadTools();
    
    const validTools = allTools.filter(tool => 
        tool.website_url && 
        tool.category && 
        tool.category !== 'Uncategorized'
    );

    const scoredTools = validTools.map(tool => {
        const scoreInfo = calculateToolScore(tool, userAnswers);
        return {
            tool,
            score: scoreInfo.score,
            debug: scoreInfo.debug
        };
    }).filter(item => item.score > 0);

    scoredTools.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.tool.name.localeCompare(b.tool.name);
    });

    // Output Debug Evidence for QA
    console.log("=== RECOMMENDATION QA EVIDENCE ===");
    const topResults = scoredTools.slice(0, 3);
    topResults.forEach(r => {
        console.log(`Tool: ${r.tool.name} (${r.tool.id})`);
        console.log(`Score: ${r.score}`);
        console.log(`Matched Finder Intents:`, r.debug.matchedIntents);
        console.log(`Source primaryUseCases:`, r.tool.primaryUseCases);
        console.log(`Budget Adj: ${r.debug.budgetAdjust} | Specialist Boost: ${r.debug.specialistBoost}`);
        console.log("---------------------------------");
    });

    // Generate explanations and labels
    return topResults.map((result, index) => {
        let label = "Strong Match";
        if (index === 1) label = "Good Alternative";
        if (index === 2) label = "Also Consider";
        
        return {
            tool: result.tool,
            score: result.score,
            label: label,
            reasons: generateExplanation(result.tool, userAnswers, result.debug),
            tradeOff: generateTradeOff(result.tool)
        };
    });
}

function calculateToolScore(tool, userAnswers) {
    let score = 0;
    const { goal, workflow, budget, specialist } = userAnswers;
    const debug = { matchedIntents: [], budgetAdjust: false, specialistBoost: false };

    // 1. HARD CONSTRAINTS
    if (budget === 'hard_free') {
        const hasFree = (tool.hasFreeTier === true || tool.has_free_tier === true || tool.hasFreeTier === 'Yes');
        if (!hasFree) return { score: -1, debug };
    }
    
    if (tool.recommendationEligible !== true) return { score: -1, debug };
    if (tool.contentReviewRequired === true) return { score: -1, debug };
    if (tool.operationalStatus === 'discontinued' || tool.lifecycleStatus === 'discontinued') return { score: -1, debug };
    if (tool.successorToolId) return { score: -1, debug };

    // 2. EXPLICIT WORKFLOW RELEVANCE (Must have at least one match to Q2)
    const toolIntents = getToolIntents(tool);
    const matchedIntentObj = toolIntents.find(i => i.intent === workflow);
    if (!workflow || !matchedIntentObj) {
        return { score: -1, debug }; // Hard Relevance Floor
    }
    
    score += 10;
    debug.matchedIntents.push(matchedIntentObj);

    // 3. SECONDARY GOAL MATCH
    const goalMapping = {
        'content': ['Content Creation', 'Writing'],
        'coding': ['Development', 'Code'],
        'research': ['Research', 'Education'],
        'image': ['Image Generation', 'Design'],
        'video': ['Video Generation', 'Video & Audio'],
        'audio': ['Audio Generation', 'Video & Audio', 'Music'],
        'automation': ['Automation', 'Productivity'],
        'meetings': ['Meetings', 'Productivity', 'Transcription'],
        'education': ['Education']
    };
    if (goal && goalMapping[goal] && tool.category && goalMapping[goal].includes(tool.category)) {
        score += 3;
    }

    // 4. BUDGET SOFT PREFERENCE
    if (budget === 'soft_free') {
        const hasFree = (tool.hasFreeTier === true || tool.has_free_tier === true || tool.hasFreeTier === 'Yes');
        if (hasFree) {
            score += 2;
            debug.budgetAdjust = true;
        }
    }

    // 5. SPECIALIST BOOST
    if (specialist === 'specialist') {
        if (goal && goalMapping[goal] && tool.category && goalMapping[goal].includes(tool.category)) {
            score += 2;
            debug.specialistBoost = true;
        }
    }

    return { score, debug };
}

function generateExplanation(tool, userAnswers, debug = null) {
    const reasons = [];
    
    let taskDesc = "Matches your selected task";
    const q2 = quizConfig.find(q => q.id === 'workflow');
    const q2Options = q2.getOptions(userAnswers);
    const selectedWorkflow = q2Options.find(o => o.value === userAnswers.workflow);
    if (selectedWorkflow) {
        taskDesc = `Matches your need to ${selectedWorkflow.text.toLowerCase()}`;
    }
    
    if (debug && debug.specialistBoost) {
        taskDesc += ` with a specialist focus`;
    }
    reasons.push(taskDesc + ".");

    if (userAnswers.budget === 'soft_free' && (tool.hasFreeTier === true || tool.has_free_tier === true || tool.hasFreeTier === 'Yes')) {
        reasons.push("Aligns with your preference for a free option.");
    } else if (userAnswers.budget === 'hard_free') {
        reasons.push("Provides a free option as requested.");
    }

    return reasons;
}

function generateTradeOff(tool) {
    if (tool.pricingNeedsReview === true) {
        if (tool.hasFreeTier === true || tool.has_free_tier === true || tool.hasFreeTier === 'Yes') {
            return "Free tier listed — pricing information may need rechecking.";
        }
        return "Pricing structure may have recently changed.";
    }
    return null;
}

// --- UI Rendering ---

function initQuiz() {
    const qCountSpan = document.getElementById('dynamic-question-count');
    if (qCountSpan) {
        qCountSpan.textContent = quizConfig.length;
    }

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
    
    let options = question.options;
    if (question.getOptions) {
        options = question.getOptions(answers);
    }
    
    if (!options || options.length === 0) {
        return;
    }

    const currentAnswer = answers[question.id];

    let html = `
        <div class="question" tabindex="-1" id="current-question-container">
            <h2>${question.text}</h2>
            ${question.helper ? `<p class="question-helper">${question.helper}</p>` : ''}
            <div class="options-grid" role="radiogroup" aria-labelledby="q-title-${currentQuestionIndex}">
                <span id="q-title-${currentQuestionIndex}" class="sr-only">${question.text}</span>
    `;

    options.forEach(option => {
        const isSelected = currentAnswer === option.value;
        html += `
            <button class="answer-option ${isSelected ? 'selected' : ''}" 
                    data-value="${option.value}"
                    onclick="window.selectAnswer('${option.value}')"
                    role="radio"
                    aria-checked="${isSelected}"
                    tabindex="0">
                ${option.text}
            </button>
        `;
    });

    html += `
            </div>
        </div>
    `;

    container.innerHTML = html;
    
    const questionContainer = document.getElementById('current-question-container');
    if (questionContainer) {
        questionContainer.focus();
    }

    // Trigger reveal animation
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
            option.setAttribute('aria-checked', 'true');
        } else {
            option.classList.remove('selected');
            option.setAttribute('aria-checked', 'false');
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

    const currentRecs = await recommendTools(answers);
    
    if (currentRecs.length === 0) {
        resetQuiz();
        return;
    }

    renderResultsPage(currentRecs);
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
        const priceBadge = hasFree ? `<span class="badge badge-success tool-price-badge">Our current data lists a free tier</span>` : '';
        
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
        
        if (window.Analytics) Analytics.track('finder_result_viewed', { tool_id: tool.id });
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
