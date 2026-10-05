import { DecisionEngine } from './decision-engine.js';
import { INTENT_LABELS, getCompatibilityLevel } from './comparison-core.js';

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

export class DecisionAssistant {
    constructor() {
        this.engine = new DecisionEngine();
        this.toolsData = [];
        this.selectedToolIds = [];
        this.currentStep = 1;
        this.answers = {
            goal: null,
            experience: null,
            budget: null,
            technical: null
        };
        this.modal = null;
        this.lastActiveElement = null;
        this.goalOptions = [];
    }

    async init() {
        if (this.toolsData.length === 0) {
            try {
                const response = await fetch('/data/comparison-index.json');
                this.toolsData = await response.json();
            } catch (e) {
                console.error("Failed to load tools data for decision assistant");
            }
        }
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'decision-modal';
        this.modal.style.display = 'none';
        this.modal.setAttribute('role', 'dialog');
        this.modal.setAttribute('aria-modal', 'true');
        this.modal.setAttribute('aria-labelledby', 'decision-modal-title');

        this.modal.innerHTML = `
            <div class="decision-modal-inner">
                <div class="decision-header">
                    <h2 id="decision-modal-title">Help me decide</h2>
                    <button class="btn btn-secondary btn-sm" id="decision-close-btn" aria-label="Close dialog">Close</button>
                </div>
                <div id="decision-content"></div>
            </div>
        `;
        document.body.appendChild(this.modal);

        this.modal.querySelector('#decision-close-btn').addEventListener('click', () => this.close());

        this.modal.addEventListener('keydown', (e) => this.trapFocus(e));
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });
    }

    trapFocus(e) {
        if (e.key === 'Escape' || e.keyCode === 27) {
            this.close();
            return;
        }

        const focusableString = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex="0"]';
        const focusables = Array.from(this.modal.querySelectorAll(focusableString));
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.key === 'Tab' || e.keyCode === 9) {
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    last.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === last) {
                    first.focus();
                    e.preventDefault();
                }
            }
        }
    }

    async open(toolIds) {
        await this.init();
        if (toolIds.length < 2) return;

        this.selectedToolIds = toolIds;
        this.currentStep = 1;
        this.answers = { goal: null, experience: null, budget: null, technical: null };
        this.lastActiveElement = document.activeElement;

        this.buildGoalOptions();

        if (!this.modal) this.createModal();

        this.renderStep();
        this.modal.style.display = 'flex';

        if (window.Analytics) Analytics.track('decision_assistant_opened', { tools: toolIds.join(',') });
    }

    close() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
        if (this.lastActiveElement && typeof this.lastActiveElement.focus === 'function') {
            try { this.lastActiveElement.focus(); } catch(e) {}
        }
    }

    buildGoalOptions() {
        const selectedTools = this.selectedToolIds.map(id => this.toolsData.find(t => t.id === id)).filter(Boolean);
        const finalIntents = this.engine.buildGoalOptions(selectedTools);

        this.goalOptions = finalIntents.map(intent => ({
            value: intent,
            label: this.formatIntentLabel(intent)
        }));
    }

    formatIntentLabel(intent) {
        if (INTENT_LABELS[intent]) return INTENT_LABELS[intent];
        return intent.split('.').map(part => part.replace(/_/g, ' ')).join(' - ').replace(/\b\w/g, l => l.toUpperCase());
    }

    handleSelect(criteria, value, label) {
        this.answers[criteria] = { value, label };
        this.currentStep++;
        this.renderStep();
    }

    renderStep() {
        const content = this.modal.querySelector('#decision-content');

        if (this.currentStep === 1) {
            content.innerHTML = `
                <div class="decision-step-indicator">Step 1 of 4</div>
                <div class="decision-question">What are you mainly trying to do?</div>
                <div class="decision-options">
                    ${this.goalOptions.map(opt => `
                        <button class="decision-option-btn" data-val="${escapeHTML(opt.value)}" data-label="${escapeHTML(opt.label)}">
                            ${escapeHTML(opt.label)}
                        </button>
                    `).join('')}
                    <button class="decision-option-btn" data-val="no_preference" data-label="No preference">
                        No preference / I'm not sure
                    </button>
                </div>
            `;
            content.querySelectorAll('.decision-option-btn').forEach(btn => {
                btn.addEventListener('click', (e) => this.handleSelect('goal', btn.dataset.val, btn.dataset.label));
            });
            content.querySelector('.decision-option-btn').focus();
        } else if (this.currentStep === 2) {
            content.innerHTML = `
                <div class="decision-step-indicator">Step 2 of 4</div>
                <div class="decision-question">What is your experience level?</div>
                <div class="decision-options">
                    <button class="decision-option-btn" data-val="Beginner" data-label="Beginner">Beginner</button>
                    <button class="decision-option-btn" data-val="Intermediate" data-label="Intermediate">Intermediate</button>
                    <button class="decision-option-btn" data-val="Advanced" data-label="Advanced">Advanced</button>
                    <button class="decision-option-btn" data-val="no_preference" data-label="No preference">No preference</button>
                </div>
                <div class="decision-nav">
                    <button class="btn btn-secondary btn-sm decision-back-btn">Back</button>
                </div>
            `;
            content.querySelectorAll('.decision-option-btn').forEach(btn => {
                btn.addEventListener('click', (e) => this.handleSelect('experience', btn.dataset.val, btn.dataset.label));
            });
            content.querySelector('.decision-back-btn').addEventListener('click', () => { this.currentStep--; this.renderStep(); });
            content.querySelector('.decision-option-btn').focus();
        } else if (this.currentStep === 3) {
            content.innerHTML = `
                <div class="decision-step-indicator">Step 3 of 4</div>
                <div class="decision-question">How important is free access / budget?</div>
                <div class="decision-options">
                    <button class="decision-option-btn" data-val="free_plan" data-label="Confirmed free plan">I need a confirmed free plan</button>
                    <button class="decision-option-btn" data-val="paid" data-label="Happy to pay / free access isn't required">I'm happy to pay / free access isn't required</button>
                    <button class="decision-option-btn" data-val="no_preference" data-label="No preference">No preference</button>
                </div>
                <div class="decision-nav">
                    <button class="btn btn-secondary btn-sm decision-back-btn">Back</button>
                </div>
            `;
            content.querySelectorAll('.decision-option-btn').forEach(btn => {
                btn.addEventListener('click', (e) => this.handleSelect('budget', btn.dataset.val, btn.dataset.label));
            });
            content.querySelector('.decision-back-btn').addEventListener('click', () => { this.currentStep--; this.renderStep(); });
            content.querySelector('.decision-option-btn').focus();
        } else if (this.currentStep === 4) {
            content.innerHTML = `
                <div class="decision-step-indicator">Step 4 of 4</div>
                <div class="decision-question">Do you have a specific technical requirement?</div>
                <div class="decision-options">
                    <button class="decision-option-btn" data-val="api" data-label="API access">API access</button>
                    <button class="decision-option-btn" data-val="open_source" data-label="Open source">Open source</button>
                    <button class="decision-option-btn" data-val="self_hosted" data-label="Self-hosting">Self-hosting</button>
                    <button class="decision-option-btn" data-val="no_preference" data-label="No specific requirement">No specific requirement</button>
                </div>
                <div class="decision-nav">
                    <button class="btn btn-secondary btn-sm decision-back-btn">Back</button>
                </div>
            `;
            content.querySelectorAll('.decision-option-btn').forEach(btn => {
                btn.addEventListener('click', (e) => this.handleSelect('technical', btn.dataset.val, btn.dataset.label));
            });
            content.querySelector('.decision-back-btn').addEventListener('click', () => { this.currentStep--; this.renderStep(); });
            content.querySelector('.decision-option-btn').focus();
        } else if (this.currentStep === 5) {
            this.renderResult(content);
        }
    }

    renderResult(content) {
        if (window.Analytics) Analytics.track('decision_assistant_completed', { tools: this.selectedToolIds.join(',') });

        const selectedTools = this.selectedToolIds.map(id => this.toolsData.find(t => t.id === id)).filter(Boolean);
        const result = this.engine.buildExplanationModel(selectedTools, this.answers);

        if (window.Analytics) Analytics.track('decision_result_shown', { resultType: result.resultType });

        let headerText = '';
        let headerDesc = '';

        if (result.resultType === 'CLEAR MATCH') {
            const recommendedTool = selectedTools.find(t => t.id === result.recommendedToolId);
            headerText = `Best match for your selected requirements: ${recommendedTool ? recommendedTool.canonicalName : ''}`;
        } else if (result.resultType === 'CLOSE MATCH / MULTIPLE FITS') {
            headerText = 'Multiple tools closely match the requirements you selected.';
        } else if (result.resultType === 'NO CLEAR MATCH') {
            headerText = 'No clear match from the confirmed data.';
            headerDesc = 'None of these tools strongly match all your preferences.';
        } else if (result.resultType === 'INSUFFICIENT CONFIRMED DATA') {
            headerText = 'No clear match from the confirmed data.';
            headerDesc = 'We don\'t have enough confirmed data to recommend a winner.';
        } else if (result.resultType === 'RECOMMENDATION RESTRICTED') {
            headerText = 'No proactive recommendation.';
            headerDesc = 'One comparison entry matches more of the requirements you selected, but it is excluded from proactive WhichAIPick recommendations. You can still review its factual matches below.';
        }

        let html = `
            <div class="decision-result-header">
                <h3>${escapeHTML(headerText)}</h3>
                ${headerDesc ? `<p>${escapeHTML(headerDesc)}</p>` : ''}
            </div>
            <div class="decision-result-cards">
        `;

        const compatibility = getCompatibilityLevel(selectedTools);
        if (compatibility === 'Different tool types' || compatibility === 'Partial overlap') {
            html += `
                <div style="background: rgba(255, 152, 0, 0.1); border: 1px solid var(--color-orange); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <strong>Note:</strong> You are comparing tools with ${compatibility.toLowerCase()}.
                </div>
            `;
        }

        // Sort evaluations by match count descending, then mismatches ascending
        const sortedEvaluations = [...result.evaluations].sort((a, b) => {
            if (a.matches.length !== b.matches.length) return b.matches.length - a.matches.length;
            return a.mismatches.length - b.mismatches.length;
        });

        sortedEvaluations.forEach(ev => {
            const isRestricted = !ev.tool.recommendationEligible;
            let restrictedText = isRestricted ? '<p style="color: var(--color-gray-400); font-size: 0.85rem; margin-bottom: 1rem;">This catalogue entry is available for explicit comparison, but is excluded from proactive WhichAIPick recommendations.</p>' : '';

            let bestMatchLabel = '';
            if (result.resultType === 'CLEAR MATCH' && ev.tool.id === result.recommendedToolId) {
                bestMatchLabel = '<span style="background: var(--accent-cyan); color: var(--bg-surface); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: bold; margin-left: 0.5rem;">Best match</span>';
            } else if (result.resultType === 'CLOSE MATCH / MULTIPLE FITS' && result.topCandidateIds.includes(ev.tool.id)) {
                bestMatchLabel = '<span style="background: rgba(255,255,255,0.2); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: bold; margin-left: 0.5rem;">Top match</span>';
            }

            html += `
                <div class="decision-result-card">
                    <h4 style="display: flex; align-items: center;"><a href="/tools/${escapeHTML(ev.tool.id)}/" style="color: inherit; text-decoration: none;">${escapeHTML(ev.tool.canonicalName)}</a>${bestMatchLabel}</h4>
                    ${restrictedText}
            `;

            if (ev.matches.length > 0) {
                html += `
                <div style="font-weight: 600; font-size: 0.9rem; margin-top: 1rem; color: #4CAF50;">Matches</div>
                <ul class="decision-matches-list">
                    ${ev.matches.map(m => `<li>${escapeHTML(m.text)}</li>`).join('')}
                </ul>`;
            }
            if (ev.mismatches.length > 0) {
                html += `
                <div style="font-weight: 600; font-size: 0.9rem; margin-top: 1rem; color: #F44336;">Doesn't match</div>
                <ul class="decision-matches-list">
                    ${ev.mismatches.map(m => `<li class="mismatch">${escapeHTML(m.text)}</li>`).join('')}
                </ul>`;
            }
            if (ev.unknowns.length > 0) {
                html += `
                <div style="font-weight: 600; font-size: 0.9rem; margin-top: 1rem; color: var(--color-gray-400);">Not confirmed</div>
                <ul class="decision-matches-list">
                    ${ev.unknowns.map(m => `<li class="unknown">${escapeHTML(m.text)}</li>`).join('')}
                </ul>`;
            }

            if (ev.matches.length === 0 && ev.mismatches.length === 0 && ev.unknowns.length === 0) {
                html += `<p style="color: var(--color-gray-400); font-size: 0.9rem;">No specific preferences apply to this tool.</p>`;
            }

            html += `</div>`;
        });

        html += `
            </div>
            <p class="decision-transparency">
                Recommendations are based on structured catalogue attributes and the preferences you selected.
                Unknown data is not treated as a negative.
            </p>
            <div class="decision-nav" style="margin-top: 2rem;">
                <button class="btn btn-secondary btn-sm" id="decision-change-btn">Change my answers</button>
                <div>
                    <button class="btn btn-secondary btn-sm" id="decision-restart-btn">Start over</button>
                    <button class="btn btn-primary btn-sm" style="margin-left: 0.5rem;" id="decision-back-compare-btn">Back to comparison</button>
                </div>
            </div>
        `;

        content.innerHTML = html;

        content.querySelector('#decision-change-btn').addEventListener('click', () => {
            this.currentStep = 4; // Go back to last question
            this.renderStep();
        });
        content.querySelector('#decision-restart-btn').addEventListener('click', () => {
            if (window.Analytics) Analytics.track('decision_assistant_restarted', { tools: this.selectedToolIds.join(',') });
            this.currentStep = 1;
            this.answers = { goal: null, experience: null, budget: null, technical: null };
            this.renderStep();
        });
        content.querySelector('#decision-back-compare-btn').addEventListener('click', () => {
            this.close();
        });

        content.querySelector('#decision-change-btn').focus();
    }
}

// Global instance
window.DecisionAssistant = new DecisionAssistant();
