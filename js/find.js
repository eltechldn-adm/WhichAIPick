// Find My Tool Quiz Logic - Phase 1 Upgrade

// Quiz state
let currentQuestion = 0;
let answers = {}; // Schema V3: Object keyed by canonical keys (goal, techComfort, priority, workType, style)

// Persistence Constants
const STORAGE_KEY = 'whichaipick_quiz_state';
const EXPIRY_DAYS = 7;

// --- Persistence Helpers ---

function saveQuizState(computedResults = null) {
    // V3 Schema
    const state = {
        version: 3,
        answers: answers,
        currentQuestionIndex: currentQuestion,
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
            console.log('Quiz state expired. Clearing.');
            localStorage.removeItem(STORAGE_KEY);
            return false;
        }

        // Migration Logic (To V3)
        // V1 (Array) -> V3 (Canonical Object)
        // V2 (Old Object) -> V3 (Canonical Object with 'techComfort')
        if (!state.version || state.version < 3) {
            console.log(`Migrating quiz state from v${state.version || 1} to v3...`);

            let newAnswers = {};
            const oldAnswers = state.answers || {};

            if (Array.isArray(oldAnswers)) {
                // V1 Array Migration
                if (oldAnswers[0]) newAnswers['goal'] = oldAnswers[0];
                if (oldAnswers[1]) newAnswers['techComfort'] = oldAnswers[1];
                if (oldAnswers[2]) newAnswers['priority'] = oldAnswers[2];
                if (oldAnswers[3]) newAnswers['workType'] = oldAnswers[3];
                if (oldAnswers[4]) newAnswers['style'] = oldAnswers[4];
            } else {
                // V2 Object Migration
                if (oldAnswers['goal']) newAnswers['goal'] = oldAnswers['goal'];
                if (oldAnswers['priority']) newAnswers['priority'] = oldAnswers['priority'];
                if (oldAnswers['workType']) newAnswers['workType'] = oldAnswers['workType'];
                if (oldAnswers['style']) newAnswers['style'] = oldAnswers['style'];

                // Rename 'tech' to 'techComfort'
                if (oldAnswers['tech']) newAnswers['techComfort'] = oldAnswers['tech'];
                if (oldAnswers['techComfort']) newAnswers['techComfort'] = oldAnswers['techComfort'];
            }

            answers = newAnswers;
            currentQuestion = state.currentQuestion || state.currentQuestionIndex || 0;

            saveQuizState(); // Upgrade storage to V3
            return true;
        }

        // V3 Restore
        answers = state.answers || {};
        currentQuestion = state.currentQuestionIndex || 0;

        if (state.resultToolIds && state.resultToolIds.length > 0) {
            // Restore results from IDs
            // We need to wait for tools to load, which happens in showStoredResults
            showStoredResults(state.resultToolIds);
            return true;
        }

        return true;
    } catch (e) {
        console.warn('Failed to restore quiz state', e);
        localStorage.removeItem(STORAGE_KEY); // Safety clear
        return false;
    }
}

function resetQuiz() {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
}

// --- Premium Summary Generator ---

// Generate result summary (V2)
function generateResultSummary(userAnswers) {
    if (!userAnswers || Object.keys(userAnswers).length < 2) return '';

    const { goal, priority, workType } = userAnswers;

    // Helper map for natural language
    const goalMap = {
        'content': 'create content',
        'build': 'build applications',
        'automate': 'automate workflows',
        'business': 'grow your business',
        'research': 'research and learn',
        'unsure': 'find helpful tools'
    };

    const priorityMap = {
        'ease': 'easy to use',
        'speed': 'fast',
        'quality': 'high quality',
        'flexibility': 'flexible',
        'cost': 'affordable'
    };

    const goalText = goalMap[goal] || goal;
    const priorityText = priorityMap[priority] || priority;

    return `
        <div class="results-summary">
            <h3>Your Personalized Recommendations</h3>
            <p>
                Based on your answers, you're looking to <strong>${goalText}</strong>. 
                We've prioritized tools that are <strong>${priorityText}</strong> and match your <strong>${workType}</strong> needs.
            </p>
        </div>
    `;
}

// Questions with exact wording as specified
// Questions with exact wording as specified
const questions = [
    {
        id: 1,
        key: 'goal',
        text: "What are you mainly trying to do right now?",
        helper: "This helps us understand your primary goal.",
        options: [
            { text: "Create content (writing, images, video)", value: "content" },
            { text: "Build or code something", value: "build" },
            { text: "Automate tasks or workflows", value: "automate" },
            { text: "Grow a business or marketing", value: "business" },
            { text: "Research, analyse, or learn", value: "research" },
            { text: "I'm not sure — I want smart recommendations", value: "unsure" }
        ]
    },
    {
        id: 2,
        key: 'techComfort',
        text: "How technical are you?",
        helper: "So we don't recommend tools that feel overwhelming.",
        options: [
            { text: "I prefer simple tools that just work", value: "simple" },
            { text: "I can follow steps but don't code", value: "intermediate" },
            { text: "I'm comfortable with advanced tools", value: "advanced" },
            { text: "I'm technical / a developer", value: "developer" }
        ]
    },
    {
        id: 3,
        key: 'priority',
        text: "What matters most to you right now?",
        options: [
            { text: "Ease of use", value: "ease" },
            { text: "Speed & saving time", value: "speed" },
            { text: "Quality of output", value: "quality" },
            { text: "Flexibility & control", value: "flexibility" },
            { text: "Keeping costs low", value: "cost" }
        ]
    },
    {
        id: 4,
        key: 'workType',
        text: "What type of work are you doing most?",
        options: [
            { text: "Writing or blogging", value: "writing" },
            { text: "Design or images", value: "design" },
            { text: "Video or audio", value: "video" },
            { text: "Coding or development", value: "coding" },
            { text: "Marketing or sales", value: "marketing" },
            { text: "Operations or admin", value: "operations" },
            { text: "Learning or research", value: "learning" }
        ]
    },
    {
        id: 5,
        key: 'style',
        text: "How do you like tools to work?",
        options: [
            { text: "One simple tool that handles everything", value: "allinone" },
            { text: "A few tools working together", value: "integrated" },
            { text: "Highly customisable and powerful", value: "powerful" },
            { text: "I'm open — show me the best options", value: "open" }
        ]
    }
];

// Weighted scoring system
// Weighted scoring system
function calculateToolScore(tool, userAnswers) {
    let score = 0;

    // Extract answers (V3 Object)
    const { goal, techComfort, priority, workType } = userAnswers;
    // Note: style is not used in score calculation currently

    // Q1: Primary Goal (strongest weight - maps to categories)
    const goalMapping = {
        'content': ['Content Creation', 'Design', 'Video & Audio'],
        'build': ['Development'],
        'automate': ['Automation', 'Productivity'],
        'business': ['Marketing', 'Business'],
        'research': ['Research', 'Education'],
        'unsure': [] // neutral - no category boost
    };

    const preferredCategories = goalMapping[goal] || [];
    if (tool.category && preferredCategories.includes(tool.category)) {
        score += 3; // Strong match
    }

    // Q2: Technical Comfort
    if (techComfort === 'simple' || techComfort === 'intermediate') {
        const beginnerFriendly = ['Productivity', 'Content Creation', 'Design', 'Marketing'];
        if (tool.category && beginnerFriendly.includes(tool.category)) {
            score += 1;
        }
    } else if (techComfort === 'advanced' || techComfort === 'developer') {
        const advancedTools = ['Development', 'Automation', 'Research'];
        if (tool.category && advancedTools.includes(tool.category)) {
            score += 1;
        }
    }

    // Q3: Priority
    if (priority === 'ease') {
        const easyCategories = ['Productivity', 'Content Creation'];
        if (tool.category && easyCategories.includes(tool.category)) {
            score += 1;
        }
    }

    // Q4: Work Type
    const workMapping = {
        'writing': ['Content Creation', 'Productivity'],
        'design': ['Design', 'Content Creation'],
        'video': ['Video & Audio', 'Content Creation'],
        'coding': ['Development'],
        'marketing': ['Marketing', 'Business'],
        'operations': ['Productivity', 'Business', 'Automation'],
        'learning': ['Education', 'Research']
    };

    const workCategories = workMapping[workType] || [];
    if (tool.category && workCategories.includes(tool.category)) {
        score += 2; // Medium weight
    }

    return score;
}

// Generate personalized explanation
function generateExplanation(tool, userAnswers) {
    const { goal, techComfort, priority, workType } = userAnswers;

    // 1. Determine "Why" (Action/Context) based on Work Type or Primary Goal
    const workMap = {
        'writing': 'writing and content creation',
        'design': 'design projects',
        'video': 'video and audio production',
        'coding': 'coding and development',
        'marketing': 'marketing campaigns',
        'operations': 'managing operations',
        'learning': 'research and learning'
    };

    // Fallback if workType is undefined or unmapped
    const goalMap = {
        'content': 'create content',
        'build': 'build projects',
        'automate': 'automate workflows',
        'business': 'grow your business',
        'research': 'conduct research',
        'unsure': 'explore AI capabilities'
    };

    let intro = '';
    if (workType && workMap[workType]) {
        intro = `Recommended for ${workMap[workType]}`;
    } else {
        intro = `Recommended to help you ${goalMap[goal] || 'achieve your goals'}`;
    }

    // 2. Determine "Constraint" (Tech Level or Priority)
    const techMap = {
        'simple': 'prefer simple tools',
        'intermediate': 'need user-friendly options',
        'advanced': 'need powerful features',
        'developer': 'require developer control'
    };

    const priorityMap = {
        'ease': 'prioritize ease of use',
        'speed': 'value speed and efficiency',
        'quality': 'need high-quality output',
        'flexibility': 'need maximum control',
        'cost': 'are budget-conscious'
    };

    let secondary = '';

    // Prioritize technical fit for beginners/devs, otherwise use priority
    if (techComfort === 'simple' || techComfort === 'intermediate') {
        secondary = `, especially since you ${techMap[techComfort]}`;
    } else if (techComfort === 'developer') {
        secondary = `, matching your need for developer control`;
    } else if (priority && priorityMap[priority]) {
        if (priority === 'cost') {
            secondary = `, as you are budget-conscious`;
        } else {
            secondary = `, matching your focus on ${priorityMap[priority].replace('prioritize ', '').replace('need ', '')}`;
        }
    } else {
        secondary = '.';
    }

    let final = `${intro}${secondary}`;
    if (!final.endsWith('.')) final += '.';

    return final;
}

// Recommend top tools
async function recommendTools(userAnswers) {
    await loadTools();
    await loadRecommendedList(); // Load recommended list for tie-breaking
    const allTools = getAllTools();

    // Filter: must have website_url and valid category
    const validTools = allTools.filter(tool =>
        tool.website_url &&
        tool.category &&
        tool.category !== 'Uncategorized'
    );

    // Calculate score for each tool
    const scoredTools = validTools.map(tool => ({
        tool,
        score: calculateToolScore(tool, userAnswers),
        explanation: generateExplanation(tool, userAnswers),
        isRecommended: recommendedData?.recommended_ids?.includes(tool.id) || false
    }));

    // Sort by score (descending), with recommended bias for similar scores
    // If scores are within 1 point, prefer recommended tools
    scoredTools.sort((a, b) => {
        const scoreDiff = b.score - a.score;

        // If scores are very different, use score
        if (Math.abs(scoreDiff) > 1) {
            return scoreDiff;
        }

        // If scores are similar (within 1 point), prefer recommended
        if (scoreDiff === 0 || Math.abs(scoreDiff) <= 1) {
            if (a.isRecommended && !b.isRecommended) return -1;
            if (!a.isRecommended && b.isRecommended) return 1;
        }

        // If both recommended or both not, use score, then alphabetical
        if (scoreDiff !== 0) return scoreDiff;
        return a.tool.name.localeCompare(b.tool.name);
    });

    // Return top 3-5 results
    // If user selected "unsure" or "open", give 5 results for variety
    // Otherwise give 3-4 based on tie scores
    const { goal, style } = userAnswers;
    const targetCount = (goal === 'unsure' || style === 'open') ? 5 : 4;

    const topResults = scoredTools.slice(0, Math.min(targetCount, scoredTools.length));

    // Guarantee at least 3 results
    if (topResults.length === 0) {
        // Fallback: return first 3 valid tools alphabetically
        return validTools.slice(0, 3).map(tool => ({
            tool,
            score: 0,
            explanation: 'Recommended as a popular AI tool option.'
        }));
    }

    return topResults;
}

// Initialize quiz
function initQuiz() {
    // Note: currentQuestion and answers are initialized at top level or restored

    // Attempt restore
    if (restoreQuizState()) {
        // If results restored, restoreQuizState handles UI
        // If partial progress restored, currentQuestion & answers are updated
        if (document.getElementById('results-container').style.display === 'block') {
            return;
        }
    } else {
        // Fresh start if no restore
        currentQuestion = 0;
        answers = {};
    }

    renderQuestion();
    updateProgress();
    updateNavigation();
}

// Render current question
function renderQuestion() {
    const container = document.getElementById('question-container');
    const question = questions[currentQuestion];
    const currentAnswer = answers[question.key]; // V2: Access by key

    let html = `
    <div class="question">
      <h2>${question.text}</h2>
      ${question.helper ? `<p class="question-helper">${question.helper}</p>` : ''}
      <div class="answers">
  `;

    question.options.forEach((option, index) => {
        const isSelected = currentAnswer === option.value;
        html += `
      <div class="answer-option ${isSelected ? 'selected' : ''}" 
           data-value="${option.value}"
           onclick="selectAnswer('${option.value}')">
        ${option.text}
      </div>
    `;
    });

    html += `
      </div>
    </div>
  `;

    container.innerHTML = html;
}

// Select answer
function selectAnswer(value) {
    const question = questions[currentQuestion];
    answers[question.key] = value; // V2: Set by key
    saveQuizState(); // Save progress

    // Update UI
    const options = document.querySelectorAll('.answer-option');
    options.forEach(option => {
        if (option.dataset.value === value) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });

    updateNavigation();

    // Analytics: Track Start
    if (currentQuestion === 0) {
        Analytics.track('quiz_start', { answer_value: value });
    }
}

// Update progress indicator
function updateProgress() {
    const progressText = document.getElementById('progress-text');
    const progressFill = document.getElementById('progress-fill');
    const percentage = ((currentQuestion + 1) / questions.length) * 100;

    progressText.textContent = `Question ${currentQuestion + 1} of ${questions.length}`;
    progressFill.style.width = `${percentage}%`;
}

// Update navigation buttons
function updateNavigation() {
    const backBtn = document.getElementById('back-btn');
    const nextBtn = document.getElementById('next-btn');

    const question = questions[currentQuestion];

    // Back button
    backBtn.disabled = currentQuestion === 0;

    // Next/Get Results button
    const hasAnswer = answers[question.key] !== undefined; // V2 Check
    nextBtn.disabled = !hasAnswer;

    if (currentQuestion === questions.length - 1) {
        nextBtn.textContent = 'Get Results';
    } else {
        nextBtn.textContent = 'Next';
    }
}

// Go to previous question
function goBack() {
    if (currentQuestion > 0) {
        currentQuestion--;
        renderQuestion();
        updateProgress();
        updateNavigation();
    }
}

// Go to next question or show results
function goNext() {
    if (currentQuestion < questions.length - 1) {
        currentQuestion++;
        renderQuestion();
        updateProgress();
        updateNavigation();
    } else {
        // Show results
        calculateAndShowResults();
    }
}

// Get domain from URL
function getDomain(url) {
    if (!url) return 'N/A';
    try {
        const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
        return urlObj.hostname.replace('www.', '');
    } catch {
        return 'N/A';
    }
}

// Calculate and show results
async function calculateAndShowResults() {
    const recommendations = await recommendTools(answers);

    // Save results
    saveQuizState(recommendations);

    // Hide quiz, show results
    document.getElementById('quiz-container').style.display = 'none';
    const resultsContainer = document.getElementById('results-container');
    resultsContainer.style.display = 'block';

    // Hide top categories section (not using category scores anymore)
    document.getElementById('top-categories').style.display = 'none';

    // Inject Summary
    const summaryHTML = generateResultSummary(answers);
    const summaryContainer = document.createElement('div');
    summaryContainer.innerHTML = summaryHTML;

    // Insert summary
    const toolsContainer = document.getElementById('recommended-tools');
    const existingSummary = resultsContainer.querySelector('.results-summary');
    if (existingSummary) existingSummary.remove(); // Prevent duplicates
    resultsContainer.insertBefore(summaryContainer, toolsContainer);

    // Render tool recommendations
    renderRecommendations(recommendations, toolsContainer);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Analytics: Track Complete
    Analytics.track('quiz_complete', {
        goal: answers.goal,
        result_count: recommendations.length
    });
}

// Show stored results (skips calculation)
async function showStoredResults(resultIds) {
    await loadTools(); // Ensure tools are loaded
    const allTools = getAllTools();

    // Reconstruct recommendations from IDs
    // We re-generate explanation based on current answers to ensure consistency
    // If IDs are missing from current toolset, they are skipped
    const recommendations = [];

    for (const id of resultIds) {
        const tool = allTools.find(t => t.id === id);
        if (tool) {
            recommendations.push({
                tool: tool,
                explanation: generateExplanation(tool, answers)
            });
        }
    }

    if (recommendations.length === 0) {
        // If no tools found (e.g. data stale), reset
        resetQuiz();
        return;
    }

    // Hide quiz, show results
    document.getElementById('quiz-container').style.display = 'none';
    const resultsContainer = document.getElementById('results-container');
    resultsContainer.style.display = 'block';

    // Hide top categories section
    document.getElementById('top-categories').style.display = 'none';

    // Inject Summary
    const summaryHTML = generateResultSummary(answers);
    const summaryContainer = document.createElement('div');
    summaryContainer.innerHTML = summaryHTML;

    const toolsContainer = document.getElementById('recommended-tools');
    const existingSummary = resultsContainer.querySelector('.results-summary');
    if (existingSummary) existingSummary.remove();
    resultsContainer.insertBefore(summaryContainer, toolsContainer);

    // Render tool recommendations
    renderRecommendations(recommendations, toolsContainer);
}

// Helper to render recommendations HTML
function renderRecommendations(recommendations, container) {
    let toolsHtml = '';

    recommendations.forEach(({ tool, explanation }) => {
        toolsHtml += `
      <div class="tool-result-card">
        <h4><a href="/tool.html?id=${encodeURIComponent(tool.id)}">${tool.name}</a></h4>
        <div class="tool-result-domain">${getDomain(tool.website_url)}</div>
        <div class="tool-result-category">${tool.category}</div>
        <div class="tool-result-explanation">${explanation}</div>
        <div class="tool-result-actions">
          <a href="/tool.html?id=${encodeURIComponent(tool.id)}" class="btn btn-sm btn-primary">View Tool</a>
          ${tool.website_url ? `
            <a href="${tool.website_url}" target="_blank" rel="noopener" class="btn-link-secondary">
              Website →
            </a>
          ` : ''}
        </div>
      </div>
    `;
    });

    container.innerHTML = toolsHtml;
}

// Start over
function startOver() {
    resetQuiz();
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    initQuiz();

    document.getElementById('back-btn').addEventListener('click', goBack);
    document.getElementById('next-btn').addEventListener('click', goNext);
    document.getElementById('start-over-btn').addEventListener('click', startOver);
});

// Make selectAnswer available globally
window.selectAnswer = selectAnswer;
