#!/usr/bin/env node

/**
 * scripts/qa/test-pipeline-scalability-gate.mjs
 *
 * 10-Tool Pipeline Scalability Gate Test Suite for WhichAIPick Stage 7H.10J-T.2.5.
 * Proves that the reusable enrichment pipeline safely handles a full 10-tool cohort
 * in ONE atomic batch in an isolated, disposable sandbox environment.
 *
 * Exercises:
 *   - Step 1: Safety & Preflight Checks
 *   - Step 2: 10-Tool Synthetic Test Cohort Creation across 10 distinct categories
 *   - Step 3: Complete 13-step pipeline execution (dry-run, apply, import, backlog, static gen, injection, Playwright QA)
 *   - Step 4: Deep Data Integrity (882 total, 46 V2, 312 Rich V1, 521 Skeletal V1, 872 non-targets untouched)
 *   - Step 5: Generic Playwright browser acceptance across all 10 newly generated pages (3 viewports)
 *   - Step 6: 9 Batch Failure & Atomic Rollback Scenarios in separate disposable workspaces
 *   - Step 7: Candidate Worktree Invariance Verification
 *
 * Directive: WhichAIPick MCD v2.0
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { execSync } from 'child_process';
import XLSX from 'xlsx';

import { validateBatch } from '../enrich/validate-batch.mjs';
import { applyEnrichment } from '../enrich/apply-enrichment.mjs';
import { runBatchAcceptance } from './test-batch-acceptance.mjs';

const require = createRequire(import.meta.url);
const NODE_MODULES_PATH = path.dirname(path.dirname(require.resolve('xlsx')));
const EXEC_ENV = {
  ...process.env,
  NODE_PATH: process.env.NODE_PATH ? `${process.env.NODE_PATH}:${NODE_MODULES_PATH}` : NODE_MODULES_PATH
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failedChecks++;
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

function computeFileHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Creates an isolated, disposable sandbox directory with copies of production assets
 */
function createSandbox() {
  const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), 'whichaipick-scale-sandbox-'));

  // Create directories
  fs.mkdirSync(path.join(sandboxDir, 'data', 'evidence'), { recursive: true });
  fs.mkdirSync(path.join(sandboxDir, 'data', 'release'), { recursive: true });
  fs.mkdirSync(path.join(sandboxDir, 'partials'), { recursive: true });
  fs.mkdirSync(path.join(sandboxDir, 'tools'), { recursive: true });
  fs.mkdirSync(path.join(sandboxDir, 'category'), { recursive: true });

  // Copy scripts directory recursively
  fs.cpSync(path.join(ROOT, 'scripts'), path.join(sandboxDir, 'scripts'), { recursive: true });

  // Copy data assets
  fs.copyFileSync(path.join(ROOT, 'data', 'tools.json'), path.join(sandboxDir, 'data', 'tools.json'));
  fs.copyFileSync(path.join(ROOT, 'data', 'tools.phase11.staged.json'), path.join(sandboxDir, 'data', 'tools.phase11.staged.json'));
  fs.copyFileSync(
    path.join(ROOT, 'data', 'WhichAIPick_Catalog_PHASE11_ANTIGRAVITY_IMPORT_CONTRACT_COMPLETE_2026-10-01.xlsx'),
    path.join(sandboxDir, 'data', 'WhichAIPick_Catalog_PHASE11_ANTIGRAVITY_IMPORT_CONTRACT_COMPLETE_2026-10-01.xlsx')
  );
  fs.copyFileSync(path.join(ROOT, 'data', 'evidence', 'phase11-evidence-ledger.json'), path.join(sandboxDir, 'data', 'evidence', 'phase11-evidence-ledger.json'));
  fs.copyFileSync(path.join(ROOT, 'data', 'comparison-index.json'), path.join(sandboxDir, 'data', 'comparison-index.json'));
  fs.copyFileSync(path.join(ROOT, 'data', 'content-enrichment-backlog.json'), path.join(sandboxDir, 'data', 'content-enrichment-backlog.json'));
  fs.copyFileSync(path.join(ROOT, 'data', 'monetisation.json'), path.join(sandboxDir, 'data', 'monetisation.json'));
  fs.copyFileSync(path.join(ROOT, 'data', 'recommended.json'), path.join(sandboxDir, 'data', 'recommended.json'));

  if (fs.existsSync(path.join(ROOT, 'data', 'release', 'tool-page-v2-canary.json'))) {
    fs.copyFileSync(path.join(ROOT, 'data', 'release', 'tool-page-v2-canary.json'), path.join(sandboxDir, 'data', 'release', 'tool-page-v2-canary.json'));
  }

  // Copy HTML templates & partials
  fs.cpSync(path.join(ROOT, 'partials'), path.join(sandboxDir, 'partials'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'category.html'), path.join(sandboxDir, 'category.html'));
  fs.copyFileSync(path.join(ROOT, 'index.html'), path.join(sandboxDir, 'index.html'));
  fs.copyFileSync(path.join(ROOT, 'tools', 'index.html'), path.join(sandboxDir, 'tools', 'index.html'));
  fs.copyFileSync(path.join(ROOT, 'package.json'), path.join(sandboxDir, 'package.json'));

  // Symlink static assets & node_modules
  for (const dir of ['css', 'js', 'assets', 'images', 'favicons']) {
    if (fs.existsSync(path.join(ROOT, dir))) {
      fs.symlinkSync(path.join(ROOT, dir), path.join(sandboxDir, dir), 'dir');
    }
  }
  fs.symlinkSync(NODE_MODULES_PATH, path.join(sandboxDir, 'node_modules'), 'dir');

  return sandboxDir;
}

function cleanupSandbox(sandboxDir) {
  if (fs.existsSync(sandboxDir)) {
    fs.rmSync(sandboxDir, { recursive: true, force: true });
  }
}

/**
 * Creates a synthetic 10-tool editorial batch payload covering all 10 categories
 * and diverse pricing structures. All claims explicitly marked as SYNTHETIC TEST DATA.
 */
function create10ToolSyntheticPayload() {
  return {
    batchId: 'batch-synthetic-10-tool-scale',
    researchDate: '2026-11-06',
    description: 'Synthetic 10-tool editorial enrichment batch payload for scalability gate verification.',
    mode: 'new',
    targetToolIds: [
      'ai-studios',
      'adwisely',
      'aftershoot',
      'answer-ai',
      'abridge',
      'agno',
      'byword',
      'alphasense',
      'aqua-voice',
      'docsumo'
    ],
    tools: {
      'ai-studios': {
        shortDescription: 'AI Studios provides generative AI video creation tools for converting scripts into presenter videos using synthetic avatars.',
        sourceSummary: "Research-based profile using AI Studios official product and pricing documentation reviewed on 6 November 2026. Features and plan limits are vendor-stated; no independent rendering quality or latency benchmarks are claimed. (SYNTHETIC TEST DATA)",
        long_description: '<p>AI Studios by DeepBrain AI is a video generation platform that enables users to create presenter-led videos from text scripts. It provides customizable virtual avatars, text-to-speech narration across multiple languages, and integrated video templates for corporate training, marketing, and education.</p><p>Users can select avatar models, adjust pronunciation and pacing, and upload custom presentation assets to produce finished video presentations without studio recording equipment.</p><p>The platform offers tiered subscription plans based on monthly video generation credits, alongside enterprise options for custom avatar creation and team collaboration.</p>',
        how_it_works: '<p>Users enter a text script, select an avatar and voice, and choose a presentation template. The platform synthesizes speech and synchronizes lip movements and expressions to generate the final video file.</p><p>Completed videos can be edited with captions, transitions, and branding elements before exporting to standard video formats.</p><p>Higher-tier plans increase generation duration allowances and unlock custom avatar training capabilities.</p>',
        feature_groups: [
          { group: 'Avatar Generation', items: ['Customizable digital presenter avatars with lip-sync.', 'Text-to-speech narration in multiple languages.', 'Custom avatar creation options for enterprise accounts.'] },
          { group: 'Video Production', items: ['Pre-built video templates for corporate communications.', 'Subtitle generation and multi-language translation.', 'Timeline editing controls for visual assets and pacing.'] },
          { group: 'Workflow and Integration', items: ['API access for automated batch video generation.', 'Shared team workspaces for collaborative video editing.', 'Direct export to common digital video formats.'] }
        ],
        bestFor: ['Corporate training teams creating presenter-led instructional videos.', 'Marketing teams producing multi-language product walkthroughs.', 'Support teams generating standardized onboarding content.'],
        notIdealFor: ['Filmmakers requiring complex cinematic camera movements.', 'Users needing an open-source or self-hosted video generator.', 'Teams requiring unlimited rendering on entry subscription tiers.'],
        workflows: [
          { title: 'Training video generation', description: 'Convert documentation into an instructional video using a digital avatar presenter.' },
          { title: 'Multi-language announcement', description: 'Create localized marketing videos in multiple languages from a single English script.' },
          { title: 'Product feature demonstration', description: 'Combine screen recordings with an avatar narration to produce product onboarding videos.' }
        ],
        pros: ['Streamlines video production without cameras or actors.', 'Supports wide variety of languages and avatar styles.', 'Offers customizable branding and presentation templates.', 'Provides developer API access on eligible plans.'],
        cons: ['Video generation allowances are credit-limited on entry tiers.', 'Avatar expressions may lack full natural variation in long videos.', 'Enterprise custom avatar training requires separate setup fees.', 'Self-hosted deployment options are not supported.'],
        pricing_overview: '<p>AI Studios offers a free tier with 3 videos per month, with paid tiers starting on the <strong>Starter</strong> plan at $24/month billed annually ($29/month on monthly billing) for extended generation allowances. (SYNTHETIC TEST DATA)</p>',
        comparison_summary: '<p>Choose <strong>AI Studios</strong> for rapid avatar-based presentation creation. Consider <strong>Synthesia</strong> or <strong>HeyGen</strong> for comparable enterprise presenter features, or <strong>Runway</strong> for generative scene animation.</p>',
        pricingModel: 'freemium',
        hasFreeTier: true,
        hasFreeTrial: true,
        freeAccessType: 'recurring_service',
        startingPrice: 24,
        priceCurrency: 'USD',
        billingPeriod: 'month',
        startingPlan: 'Starter',
        trialDays: 7,
        apiAvailable: true,
        platforms: ['web', 'api'],
        verificationSources: ['https://www.aistudios.com/', 'https://www.aistudios.com/pricing'],
        evidence: [{ evidenceId: 'E9001', sourceURL: 'https://www.aistudios.com/pricing', reviewedAt: '2026-11-06', method: 'official_source_review', finding: 'Verified Starter plan at $24/month with synthetic avatar presenter limits.' }]
      },
      'adwisely': {
        shortDescription: 'Adwisely provides automated digital advertising campaign management and cross-channel retargeting for online retail businesses.',
        sourceSummary: "Research-based profile using Adwisely official product and pricing documentation reviewed on 6 November 2026. Features and plan limits are vendor-stated; no independent return-on-ad-spend or campaign benchmarks are claimed. (SYNTHETIC TEST DATA)",
        long_description: '<p>Adwisely is an automated paid media management platform built for e-commerce operators running campaigns across major digital advertising networks. It connects to store product catalogs to generate dynamic product ads and manage retargeting audiences.</p><p>The system automatically sets up and optimizes prospecting and retargeting ads across Meta and Google properties, adjusting budgets based on store transaction performance.</p><p>Campaign performance metrics are centralized in an operational dashboard with direct controls for return-on-ad-spend targets and creative rules.</p>',
        how_it_works: '<p>Operators integrate their online storefront and connect advertising accounts. Adwisely ingests product inventory data and identifies top-performing catalog items for automated ad generation.</p><p>The engine builds dynamic advertising campaigns and deploys them to selected channels with automated budget allocation and audience segmentation.</p><p>Performance algorithms monitor conversion efficiency, shifting ad spend to higher-performing creative assets and campaigns.</p>',
        feature_groups: [
          { group: 'Campaign Automation', items: ['Automated ad creation from live store catalog data.', 'Cross-channel audience segmentation and retargeting rules.', 'Budget pacing controls aligned to target ROAS thresholds.'] },
          { group: 'Channel Integration', items: ['Native integration with Meta and Google advertising APIs.', 'Real-time inventory synchronization with e-commerce platforms.', 'Centralized cross-channel reporting and conversion tracking.'] },
          { group: 'Optimization Engine', items: ['Automated creative fatigue detection and asset swapping.', 'Continuous bidding adjustments based on sales signals.', 'Scheduled promotion templates for seasonal retail events.'] }
        ],
        bestFor: ['E-commerce merchants seeking hands-off retargeting campaign management.', 'Direct-to-consumer brands scaling catalog ad variations.', 'Digital agencies managing multi-channel storefront advertising.'],
        notIdealFor: ['Businesses without an established online store product catalog.', 'Marketers demanding full manual keyword bid adjustments.', 'Teams seeking organic social media management capabilities.'],
        workflows: [
          { title: 'Catalog retargeting launch', description: 'Deploy automated abandoned-cart retargeting ads across Meta platforms from catalog data.' },
          { title: 'Cross-channel prospecting', description: 'Configure lookalike prospecting campaigns on Google and Facebook with target ROAS rules.' },
          { title: 'Seasonal promotion sync', description: 'Run automated holiday campaign creatives across product inventory with scheduled budget boosts.' }
        ],
        pros: ['Reduces manual setup time for dynamic product retargeting.', 'Integrates directly with Shopify and WooCommerce store catalogs.', 'Centralizes reporting across Meta and Google advertising channels.', 'Provides transparent ROAS tracking and budget allocation rules.'],
        cons: ['Requires an active online store catalog to deliver core value.', 'Subscription fee applies on top of direct advertising network spend.', 'Custom bidding controls are limited compared to native ad managers.', 'Requires continuous ad budget to maintain algorithm effectiveness.'],
        pricing_overview: '<p>Adwisely requires a paid subscription starting on the <strong>Growth</strong> plan at $79/month, with a 14-day free trial for new accounts to test automated campaign workflows. (SYNTHETIC TEST DATA)</p>',
        comparison_summary: '<p>Choose <strong>Adwisely</strong> for automated e-commerce catalog retargeting. Consider <strong>Madgicx</strong> for advanced creative analytics, or <strong>AdCreative.ai</strong> for synthetic ad banner design.</p>',
        pricingModel: 'paid',
        hasFreeTier: false,
        hasFreeTrial: true,
        freeAccessType: 'trial_only',
        startingPrice: 79,
        priceCurrency: 'USD',
        billingPeriod: 'month',
        startingPlan: 'Growth',
        trialDays: 14,
        apiAvailable: false,
        platforms: ['web'],
        verificationSources: ['https://adwisely.com/', 'https://adwisely.com/pricing'],
        evidence: [{ evidenceId: 'E9002', sourceURL: 'https://adwisely.com/pricing', reviewedAt: '2026-11-06', method: 'official_source_review', finding: 'Verified Growth plan at $79/month with 14-day evaluation trial.' }]
      },
      'aftershoot': {
        shortDescription: 'Aftershoot provides automated photo culling and editing software designed for professional event and portrait photographers.',
        sourceSummary: "Research-based profile using Aftershoot official product and pricing documentation reviewed on 6 November 2026. Features and plan limits are vendor-stated; no independent batch processing speed or accuracy benchmarks are claimed. (SYNTHETIC TEST DATA)",
        long_description: '<p>Aftershoot is a desktop application designed to streamline the post-production workflow for professional photographers handling large image volumes. It assists with image selection by detecting duplicate frames, closed eyes, focus sharpness, and composition quality.</p><p>In addition to culling, the software offers personalized AI editing profiles that learn a photographer’s color grading, exposure adjustments, and cropping preferences from historical catalogs.</p><p>The application runs on local desktop hardware to process RAW and JPEG files without requiring continuous cloud photo uploads.</p>',
        how_it_works: '<p>Photographers import memory card folders or Lightroom catalogs into the desktop application and select culling sensitivity parameters.</p><p>The engine analyzes images locally for focus, blinking, and composition, grouping similar captures and applying color flags and star ratings.</p><p>Users review selections, apply learned AI editing profiles, and export the graded catalog back into standard photo editing software.</p>',
        feature_groups: [
          { group: 'Automated Culling', items: ['Focus detection and blur assessment across RAW captures.', 'Blink and closed-eye identification in portrait groups.', 'Automated duplicate grouping with recommended hero frames.'] },
          { group: 'Personal AI Editing', items: ['Custom editing profile creation learned from past Lightroom catalogs.', 'Automated exposure, white balance, and contrast adjustments.', 'Intelligent straightening and cropping based on compositional rules.'] },
          { group: 'Workflow Integration', items: ['Two-way metadata synchronization with Adobe Lightroom and Capture One.', 'Local desktop processing with no file upload bandwidth bottlenecks.', 'Custom color label and star rating assignment rules.'] }
        ],
        bestFor: ['Wedding and event photographers culling thousands of images per shoot.', 'Commercial portrait studios standardizing batch color editing.', 'High-volume photography businesses seeking local desktop processing.'],
        notIdealFor: ['Casual mobile photographers looking for cloud-only filters.', 'Users seeking vector graphics design or digital illustration tools.', 'Photographers without desktop computers meeting minimum RAM requirements.'],
        workflows: [
          { title: 'Wedding catalog culling', description: 'Import a 3,000-image shoot to flag blurred shots, blinks, and select top poses automatically.' },
          { title: 'Personal editing profile training', description: 'Train a custom AI profile on 5,000 previously edited photos to mirror personal grading style.' },
          { title: 'Lightroom metadata roundtrip', description: 'Synchronize cull ratings and automated crops directly back into an existing Lightroom catalog.' }
        ],
        pros: ['Processes image files locally without cloud bandwidth delays.', 'Significantly reduces manual culling time on high-volume shoots.', 'AI editing profiles learn personalized photographic aesthetic.', 'Seamlessly integrates with Adobe Lightroom and Capture One catalogs.'],
        cons: ['Desktop application requires capable workstation hardware for speed.', 'Requires significant catalog history to train accurate editing profiles.', 'Subscription pricing represents ongoing expense for seasonal photographers.', 'Initial configuration requires adjusting sensitivity thresholds to taste.'],
        pricing_overview: '<p>Aftershoot pricing starts at $10/month billed annually ($15/month billed monthly) for the <strong>Culling</strong> plan, and includes a 30-day free trial. (SYNTHETIC TEST DATA)</p>',
        comparison_summary: '<p>Choose <strong>Aftershoot</strong> for desktop culling and personalized editing. Consider <strong>Imagen AI</strong> for cloud-based Lightroom profile editing, or <strong>Narrative Select</strong> for culling-focused workflows.</p>',
        pricingModel: 'paid',
        hasFreeTier: false,
        hasFreeTrial: true,
        freeAccessType: 'trial_only',
        startingPrice: 10,
        priceCurrency: 'USD',
        billingPeriod: 'month',
        startingPlan: 'Culling',
        trialDays: 30,
        apiAvailable: false,
        platforms: ['windows', 'macos'],
        verificationSources: ['https://aftershoot.com/', 'https://aftershoot.com/pricing'],
        evidence: [{ evidenceId: 'E9003', sourceURL: 'https://aftershoot.com/pricing', reviewedAt: '2026-11-06', method: 'official_source_review', finding: 'Verified Culling tier at $10/month billed annually with 30-day trial.' }]
      },
      'answer-ai': {
        shortDescription: 'Answer.AI is a free educational homework assistance and tutoring application providing step-by-step problem explanations.',
        sourceSummary: "Research-based profile using Answer.AI official product and application documentation reviewed on 6 November 2026. Features and plan limits are vendor-stated; no independent curriculum accuracy or test score benchmarks are claimed. (SYNTHETIC TEST DATA)",
        long_description: '<p>Answer.AI is an AI-powered study companion designed for students seeking explanations across mathematics, science, and humanities subjects. The tool allows learners to capture photo snapshots of homework problems or submit written questions to receive structured explanations.</p><p>Rather than providing direct numerical answers alone, the application breaks down underlying conceptual principles and step-by-step solving methods to support independent learning.</p><p>The application is accessible across mobile devices and browser extensions, offering free study assistance for secondary and university students.</p>',
        how_it_works: '<p>Students capture a photo of a textbook problem, equation, or diagram using a smartphone camera or input questions directly.</p><p>The recognition engine extracts text and mathematical notation, formulating a structured conceptual breakdown.</p><p>The interface presents sequential problem steps, foundational formulas, and follow-up practice prompts for student review.</p>',
        feature_groups: [
          { group: 'Problem Solving', items: ['Camera snapshot capture for textbook equations and word problems.', 'Step-by-step mathematical reasoning and formula explanations.', 'Diagram parsing for geometric and scientific concepts.'] },
          { group: 'Study Assistance', items: ['Interactive follow-up questions to clarify confusing steps.', 'Subject coverage spanning mathematics, physics, and chemistry.', 'Practice problem generation to reinforce underlying principles.'] },
          { group: 'Cross-Device Access', items: ['Mobile apps available for iOS and Android smartphones.', 'Browser extension integration for online study materials.', 'History log preserving past problem explanations for revision.'] }
        ],
        bestFor: ['High school and university students reviewing complex homework problems.', 'Learners seeking step-by-step mathematical derivation guidance.', 'Parents assisting students with unfamiliar academic curricula.'],
        notIdealFor: ['Commercial organizations requiring enterprise compliance tools.', 'Researchers seeking peer-reviewed citation extraction software.', 'Users seeking fully automated essay generation services.'],
        workflows: [
          { title: 'Math homework derivation', description: 'Photograph an algebraic equation to review step-by-step derivation and formula application.' },
          { title: 'Exam concept revision', description: 'Generate practice quiz questions on specific physics topics to prepare for exams.' },
          { title: 'Online reading comprehension', description: 'Use the browser extension to explain complex technical passages in academic articles.' }
        ],
        pros: ['Completely free educational access without mandatory paywalls.', 'Provides detailed pedagogical explanations rather than bare answers.', 'Supports multi-modal camera input for handwritten and printed math.', 'Offers accessible mobile and browser extension study interfaces.'],
        cons: ['May occasionally misinterpret complex handwritten symbols.', 'Explanation depth varies across advanced postgraduate topics.', 'Requires active internet connectivity for model inference.', 'Focuses primarily on STEM subjects rather than creative arts.'],
        pricing_overview: '<p>Answer.AI is a free educational tool with no paid subscription fees or usage paywalls for students and educators. (SYNTHETIC TEST DATA)</p>',
        comparison_summary: '<p>Choose <strong>Answer.AI</strong> for free step-by-step homework help. Consider <strong>Photomath</strong> for specialized calculator step derivations, or <strong>Quizlet</strong> for flashcard-centered memorization.</p>',
        pricingModel: 'free',
        hasFreeTier: true,
        hasFreeTrial: false,
        freeAccessType: 'recurring_service',
        startingPrice: null,
        priceCurrency: null,
        billingPeriod: null,
        startingPlan: null,
        trialDays: null,
        apiAvailable: false,
        platforms: ['ios', 'android', 'extension'],
        verificationSources: ['https://answerai.pro/'],
        evidence: [{ evidenceId: 'E9004', sourceURL: 'https://answerai.pro/', reviewedAt: '2026-11-06', method: 'official_source_review', finding: 'Verified free educational application structure with zero subscription fees.' }]
      },
      'abridge': {
        shortDescription: 'Abridge delivers enterprise generative AI clinical documentation software that summarizes patient-clinician conversations for healthcare systems.',
        sourceSummary: "Research-based profile using Abridge official product and healthcare compliance documentation reviewed on 6 November 2026. Features and plan limits are vendor-stated; no independent diagnostic accuracy or charting time benchmarks are claimed. (SYNTHETIC TEST DATA)",
        long_description: '<p>Abridge is an enterprise medical conversation platform engineered for health systems and clinical practices. It ambiently captures and summarizes medical discussions during patient encounters to produce structured clinical notes directly compatible with electronic health record (EHR) systems.</p><p>The platform maps complex conversational dialogue into standard clinical documentation formats, including SOAP notes, billing codes, and patient-facing after-visit summaries.</p><p>Designed for healthcare compliance, Abridge incorporates enterprise-grade encryption, HIPAA compliance controls, and institutional audit trails.</p>',
        how_it_works: '<p>Clinicians initiate ambient recording during an in-person or telehealth patient consultation via mobile or desktop interfaces.</p><p>The specialized medical speech model transcribes clinical terminology, distinguishing between patient concerns, physical findings, and therapeutic plans.</p><p>Structured medical notes are formatted and synced directly into the provider’s electronic health record software for clinician signature.</p>',
        feature_groups: [
          { group: 'Ambient Documentation', items: ['Real-time clinical speech transcription in noisy examination environments.', 'Automated synthesis into standard SOAP structured note sections.', 'Direct EHR integration with Epic, Cerner, and other hospital systems.'] },
          { group: 'Clinical Precision', items: ['Specialized medical ontology covering thousands of clinical terms.', 'Linked source audio snippets allowing instant clinician verification.', 'Patient-friendly after-visit summaries in plain everyday language.'] },
          { group: 'Enterprise Security', items: ['HIPAA-compliant infrastructure with end-to-end data encryption.', 'Role-based access permissions and comprehensive hospital audit logs.', 'Private cloud and enterprise deployment architecture options.'] }
        ],
        bestFor: ['Hospital networks seeking to reduce physician administrative charting burden.', 'Outpatient clinics standardizing EHR clinical documentation.', 'Healthcare systems requiring strict HIPAA-compliant enterprise AI deployment.'],
        notIdealFor: ['Individual consumers seeking casual personal voice note dictation.', 'Non-medical commercial business meeting transcription.', 'Clinics requiring an off-the-shelf low-cost consumer subscription.'],
        workflows: [
          { title: 'Outpatient consultation note', description: 'Record an ambient patient visit to generate a complete SOAP note mapped to hospital EHR templates.' },
          { title: 'Note verification audit', description: 'Click specific medical terms in the generated note to review exact timestamped audio proof.' },
          { title: 'Patient summary generation', description: 'Export plain-language visit summaries and medication instructions for patient portal review.' }
        ],
        pros: ['Substantially decreases administrative documentation time for physicians.', 'Links generated clinical text directly to underlying conversational audio.', 'Deeply integrates with major institutional electronic health record systems.', 'Complies with rigorous healthcare privacy and enterprise compliance standards.'],
        cons: ['Enterprise-only software with no self-serve individual pricing tiers.', 'Requires organizational IT integration and EHR configuration.', 'Requires physician oversight to verify clinical note accuracy before sign-off.', 'Specialized solely for healthcare settings rather than general business.'],
        pricing_overview: '<p>Abridge provides enterprise medical transcription and clinical documentation with customized institutional pricing based on hospital system deployment scale. (SYNTHETIC TEST DATA)</p>',
        comparison_summary: '<p>Choose <strong>Abridge</strong> for enterprise EHR-integrated clinical documentation. Consider <strong>Nuance DAX Copilot</strong> for established hospital environments, or <strong>Suki</strong> for outpatient voice assistants.</p>',
        pricingModel: 'enterprise',
        hasFreeTier: false,
        hasFreeTrial: false,
        freeAccessType: 'none',
        startingPrice: null,
        priceCurrency: null,
        billingPeriod: null,
        startingPlan: null,
        trialDays: null,
        apiAvailable: true,
        platforms: ['web'],
        verificationSources: ['https://www.abridge.com/'],
        evidence: [{ evidenceId: 'E9005', sourceURL: 'https://www.abridge.com/', reviewedAt: '2026-11-06', method: 'official_source_review', finding: 'Verified enterprise healthcare model with custom institutional licensing.' }]
      },
      'agno': {
        shortDescription: 'Agno is an open-source framework and platform for building, debugging, and running multi-modal autonomous AI agent architectures.',
        sourceSummary: "Research-based profile using Agno official developer documentation and platform pricing reviewed on 6 November 2026. Features and plan limits are vendor-stated; no independent agent latency or benchmark accuracy metrics are claimed. (SYNTHETIC TEST DATA)",
        long_description: '<p>Agno (formerly Phidata) is a software framework and hosted infrastructure platform designed for software engineers building autonomous AI agent systems. It enables developers to construct multi-agent teams with shared persistent memory, tool execution capabilities, and vector search knowledge bases.</p><p>The platform provides developer libraries and web interfaces for monitoring agent runs, evaluating execution steps, and managing operational agent deployments.</p><p>Agno offers a free community open-source tier for individual builders, paired with hosted subscription tiers for teams requiring shared session memory and observability.</p>',
        how_it_works: '<p>Engineers define agent personas, available tool functions, and storage backends using Python or TypeScript SDKs.</p><p>Agents coordinate execution flow, invoke external APIs or database queries, and maintain session context across user interactions.</p><p>The hosted platform monitors agent execution traces, logging latency, token expenditures, and tool response payloads for debugging.</p>',
        feature_groups: [
          { group: 'Agent Architecture', items: ['Multi-agent delegation and autonomous collaboration patterns.', 'Persistent session memory with SQL and vector database connectors.', 'Structured JSON output schema validation and error recovery.'] },
          { group: 'Developer Tools', items: ['Interactive web UI for testing and debugging multi-step agent reasoning.', 'Execution tracing covering tool invocations, token spend, and latency.', 'Pre-built tool integrations for web search, databases, and APIs.'] },
          { group: 'Deployment & Scale', items: ['Self-hosted open-source framework with containerized deployment.', 'Hosted cloud control plane for team agent session management.', 'Role-based access permissions and API token governance.'] }
        ],
        bestFor: ['Software developers building multi-agent autonomous applications.', 'Engineering teams adding structured tool execution to LLM workflows.', 'Organizations seeking open-source agent frameworks with enterprise hosting.'],
        notIdealFor: ['Non-technical business users seeking no-code prompt assistants.', 'Marketers looking for simple out-of-the-box social media bots.', 'Teams requiring fully managed pre-built customer support applications.'],
        workflows: [
          { title: 'Financial research agent team', description: 'Build collaborative agents that retrieve market news, query SQL databases, and write report summaries.' },
          { title: 'Agent execution tracing', description: 'Debug multi-step tool calls and inspect latency bottlenecks using the hosted developer UI.' },
          { title: 'Self-hosted agent deployment', description: 'Containerize and run autonomous agent services on private cloud infrastructure with local memory.' }
        ],
        pros: ['Combines flexible open-source framework with hosted observability.', 'Supports complex multi-agent orchestration and shared persistent memory.', 'Provides native tool calling integrations for popular web and data services.', 'Offers generous free community access for individual software builders.'],
        cons: ['Requires software engineering proficiency in Python or TypeScript.', 'Multi-agent architectures can incur unpredictable underlying LLM token costs.', 'Self-hosting enterprise memory backends requires infrastructure management.', 'Evolving library ecosystem requires periodic SDK version maintenance.'],
        pricing_overview: '<p>Agno provides a free developer tier for building autonomous agents, and offers a paid <strong>Pro</strong> plan at $20/month per active user for team collaboration and hosted memory. (SYNTHETIC TEST DATA)</p>',
        comparison_summary: '<p>Choose <strong>Agno</strong> for modular multi-modal agent development. Consider <strong>CrewAI</strong> for role-based multi-agent teams, or <strong>LangChain</strong> for broad ecosystem component chaining.</p>',
        pricingModel: 'freemium',
        hasFreeTier: true,
        hasFreeTrial: false,
        freeAccessType: 'recurring_service',
        startingPrice: 20,
        priceCurrency: 'USD',
        billingPeriod: 'month',
        startingPlan: 'Pro',
        trialDays: null,
        apiAvailable: true,
        platforms: ['web'],
        verificationSources: ['https://www.agno.com/', 'https://www.agno.com/pricing'],
        evidence: [{ evidenceId: 'E9006', sourceURL: 'https://www.agno.com/pricing', reviewedAt: '2026-11-06', method: 'official_source_review', finding: 'Verified developer free tier and Pro plan at $20/month per user.' }]
      },
      'byword': {
        shortDescription: 'Byword is an AI-powered article generation platform designed for large-scale programmatic search engine optimization and publishing.',
        sourceSummary: "Research-based profile using Byword official product and pricing documentation reviewed on 6 November 2026. Features and plan limits are vendor-stated; no independent search ranking or organic traffic benchmarks are claimed. (SYNTHETIC TEST DATA)",
        long_description: '<p>Byword is a content production engine built specifically for publishers, agency operators, and digital marketing teams executing programmatic content strategies. The platform generates comprehensive, search-optimized articles from keyword lists or topical outlines.</p><p>The system incorporates automated internal linking, AI image generation, citation sourcing, and direct content management system (CMS) integrations for streamlined publishing.</p><p>Byword operates on monthly credit subscriptions with pay-as-you-go credit expansion options for scaling publishing volume.</p>',
        how_it_works: '<p>Content creators submit a list of target search keywords or upload custom article title spreadsheets.</p><p>Byword conducts automated keyword research, constructs heading structures, generates written copy, and embeds relevant synthetic images.</p><p>Drafts are exported directly to connected platforms like WordPress, Webflow, or Shopify as scheduled or published posts.</p>',
        feature_groups: [
          { group: 'Programmatic Production', items: ['Batch article generation from CSV keyword spreadsheets.', 'Automated heading architecture optimized for target search queries.', 'Multi-language content generation across dozens of major languages.'] },
          { group: 'Media & Linking', items: ['Automated relevant royalty-free and AI-generated image insertion.', 'Internal linking automation based on existing site sitemaps.', 'External citation sourcing to reinforce factual authority.'] },
          { group: 'CMS Integration', items: ['One-click publishing to WordPress, Webflow, and Ghost sites.', 'Custom publishing schedule automation for steady drip indexing.', 'Webhook and developer API support for custom editorial pipelines.'] }
        ],
        bestFor: ['SEO agencies producing high-volume informational article libraries.', 'E-commerce websites building out topical resource centers.', 'Growth marketing teams testing programmatic search acquisition funnels.'],
        notIdealFor: ['Thought leadership essayists seeking nuanced subjective editorial voice.', 'Technical writers requiring deeply verified bespoke API documentation.', 'Casual writers wanting a conversational prompt chatbot interface.'],
        workflows: [
          { title: 'Programmatic keyword batch', description: 'Upload a 100-row spreadsheet of long-tail search terms to generate draft articles in bulk.' },
          { title: 'Automated Webflow publishing', description: 'Connect a Webflow CMS collection to push finished articles with images directly to drafts.' },
          { title: 'Topical cluster expansion', description: 'Generate interconnected supporting articles with automated internal links to a pillar page.' }
        ],
        pros: ['Accelerates high-volume search content drafting significantly.', 'Supports direct CMS publication to WordPress, Webflow, and Ghost.', 'Automates tedious asset gathering, including images and internal links.', 'Provides clean spreadsheet-driven batch workflows for SEO agencies.'],
        cons: ['Generated copy requires human editorial review for brand voice consistency.', 'Subscription cost increases significantly at enterprise article volumes.', 'Search engine algorithmic shifts require ongoing quality oversight.', 'Not intended for nuanced opinion or investigative journalism.'],
        pricing_overview: '<p>Byword plans start at $99/month for the <strong>Starter</strong> tier with 25 monthly article generation credits, scaling up to higher-volume production tiers. (SYNTHETIC TEST DATA)</p>',
        comparison_summary: '<p>Choose <strong>Byword</strong> for high-volume programmatic SEO article generation. Consider <strong>Surfer SEO</strong> for granular keyword content scoring, or <strong>KoalaWriter</strong> for affiliate review drafting.</p>',
        pricingModel: 'paid',
        hasFreeTier: false,
        hasFreeTrial: false,
        freeAccessType: 'none',
        startingPrice: 99,
        priceCurrency: 'USD',
        billingPeriod: 'month',
        startingPlan: 'Starter',
        trialDays: null,
        apiAvailable: true,
        platforms: ['web', 'api'],
        verificationSources: ['https://byword.ai/', 'https://byword.ai/pricing'],
        evidence: [{ evidenceId: 'E9007', sourceURL: 'https://byword.ai/pricing', reviewedAt: '2026-11-06', method: 'official_source_review', finding: 'Verified Starter plan at $99/month for 25 monthly article generation credits.' }]
      },
      'alphasense': {
        shortDescription: 'AlphaSense is an enterprise market intelligence platform that applies AI search and sentiment analysis to financial disclosures and research.',
        sourceSummary: "Research-based profile using AlphaSense official product documentation and investor research materials reviewed on 6 November 2026. Features and plan limits are vendor-stated; no independent investment alpha or search precision benchmarks are claimed. (SYNTHETIC TEST DATA)",
        long_description: '<p>AlphaSense is a financial intelligence and semantic search platform used by investment banks, hedge funds, and corporate strategy teams. It aggregates and indexes millions of public filings, earnings call transcripts, broker research reports, and expert interview transcripts.</p><p>The platform uses specialized financial language models to execute thematic research, track competitive mentions, and analyze executive commentary changes across quarterly reporting periods.</p><p>AlphaSense is distributed through institutional enterprise subscriptions tailored to corporate strategy and investment management organizations.</p>',
        how_it_works: '<p>Investment analysts search across public company filings, broker research, and proprietary internal document repositories.</p><p>Semantic search models identify relevant thematic passages, highlighting keyword variants and linguistic sentiment changes.</p><p>Analysts compile research notebooks, set real-time alert triggers for competitor disclosures, and export briefing summaries.</p>',
        feature_groups: [
          { group: 'Document Aggregation', items: ['Centralized access to SEC filings, global disclosures, and trade news.', 'Integrated Wall Street equity research and broker coverage.', 'Expert call transcript library spanning thousands of industry interviews.'] },
          { group: 'Semantic Intelligence', items: ['Smart search detecting financial synonyms and conceptual phrasing.', 'Sentiment analysis tracking linguistic shifts in executive call commentary.', 'Automated summarization of key disclosures across quarterly reports.'] },
          { group: 'Workflow & Alerts', items: ['Real-time watchlist alerts triggered by competitor filing filings.', 'Collaborative research notebooks with collaborative team annotations.', 'Enterprise security compliance with SOC 2 Type II certification.'] }
        ],
        bestFor: ['Buy-side and sell-side equity research analysts conducting company due diligence.', 'Corporate strategy executives monitoring competitive market developments.', 'Private equity teams evaluating potential investment opportunities.'],
        notIdealFor: ['Retail stock traders seeking low-cost consumer chart screening software.', 'Non-financial businesses requiring basic web search capabilities.', 'Casual users wanting simple automated blog generation tools.'],
        workflows: [
          { title: 'Earnings call transcript analysis', description: 'Compare quarterly call transcripts to highlight sentiment shifts in management commentary.' },
          { title: 'Thematic industry research', description: 'Search global disclosures and broker notes for regulatory commentary across market sectors.' },
          { title: 'Competitor disclosure tracking', description: 'Configure automated watchlists to receive notifications when competitors file new regulatory forms.' }
        ],
        pros: ['Comprehensive financial repository uniting filings, transcripts, and research.', 'Sophisticated financial search models distinguish nuances in business terminology.', 'Saves substantial research time during intensive corporate due diligence.', 'Provides robust enterprise compliance and team collaboration controls.'],
        cons: ['Premium enterprise subscription cost prohibitive for retail investors.', 'Complex multi-feature interface requires initial analyst onboarding.', 'Access to specific broker research tiers requires separate licensing.', 'Focused exclusively on commercial financial intelligence applications.'],
        pricing_overview: '<p>AlphaSense offers enterprise intelligence contracts tailored to corporate research teams, along with a product demonstration trial for qualified investment organizations. (SYNTHETIC TEST DATA)</p>',
        comparison_summary: '<p>Choose <strong>AlphaSense</strong> for deep institutional financial search and transcript analysis. Consider <strong>Bloomberg Terminal</strong> for real-time market trading feeds, or <strong>Koyfin</strong> for lower-cost retail financial graphing.</p>',
        pricingModel: 'enterprise',
        hasFreeTier: false,
        hasFreeTrial: true,
        freeAccessType: 'trial_only',
        startingPrice: null,
        priceCurrency: null,
        billingPeriod: null,
        startingPlan: null,
        trialDays: 14,
        apiAvailable: true,
        platforms: ['web', 'ios', 'android', 'api'],
        verificationSources: ['https://www.alpha-sense.com/'],
        evidence: [{ evidenceId: 'E9008', sourceURL: 'https://www.alpha-sense.com/', reviewedAt: '2026-11-06', method: 'official_source_review', finding: 'Verified enterprise contract structure with custom corporate deployment.' }]
      },
      'aqua-voice': {
        shortDescription: 'Aqua Voice is a voice-controlled text editor designed for real-time natural language writing and dictation on desktop devices.',
        sourceSummary: "Research-based profile using Aqua Voice official product and application documentation reviewed on 6 November 2026. Features and plan limits are vendor-stated; no independent words-per-minute or word error rate benchmarks are claimed. (SYNTHETIC TEST DATA)",
        long_description: '<p>Aqua Voice is an interactive speech-driven text composition tool created for writers, programmers, and professionals who prefer drafting by voice. The editor listens continuously to conversational dictation, transcribing speech while automatically formatting punctuation and styling.</p><p>In addition to transcription, the application allows users to issue natural voice editing commands, such as replacing words, rephrasing sentences, and navigating document paragraphs without touching a physical keyboard.</p><p>The application is offered via web and desktop applications, providing free daily usage with subscription plans for professional writers.</p>',
        how_it_works: '<p>Users launch the editor and speak naturally into their computer or mobile microphone.</p><p>The speech model transcribes conversational thoughts in real time, filtering filler words and applying appropriate punctuation.</p><p>Writers use vocal instructions like "delete that line" or "make this more concise" to edit document text on the fly.</p>',
        feature_groups: [
          { group: 'Voice Composition', items: ['Continuous natural speech dictation with automatic sentence punctuation.', 'Automatic removal of verbal fillers such as um and uh from transcriptions.', 'Real-time word appearance optimized for low-latency visual feedback.'] },
          { group: 'Vocal Editing', items: ['Natural spoken commands to replace, rephrase, or reformat text sections.', 'Document navigation controls to move cursors between paragraphs.', 'Selective text styling commands for bolding, bulleting, and capitalization.'] },
          { group: 'Cross-Platform Editing', items: ['Desktop application support for macOS and web browsers.', 'Direct export to standard markdown, rich text, and clipboard.', 'Document auto-saving with offline local temporary storage.'] }
        ],
        bestFor: ['Authors and journalists drafting initial prose manuscripts at high speed.', 'Professionals suffering from repetitive strain injury seeking hands-free writing.', 'Knowledge workers composing lengthy email updates and meeting notes.'],
        notIdealFor: ['Audio editors seeking multi-track musical sound design software.', 'Developers seeking native code editor auto-completion plugins.', 'Users operating in noisy public environments without directional microphones.'],
        workflows: [
          { title: 'Article first-drafting', description: 'Dictate an initial article draft continuously to capture ideas without stopping to type.' },
          { title: 'Hands-free document editing', description: 'Instruct the editor by voice to rephrase paragraphs and adjust document tone.' },
          { title: 'Executive email composition', description: 'Speak complex business correspondence while the editor formats formal sentence structures.' }
        ],
        pros: ['Enables rapid writing at conversational speaking speeds.', 'Seamlessly combines voice dictation with direct vocal editing commands.', 'Intelligently strips verbal hesitations and pauses from final copy.', 'Clean, distraction-free document editing interface.'],
        cons: ['Requires a quiet room or quality microphone for optimal accuracy.', 'Requires a learning curve to master conversational editing command phrasing.', 'Free tier limits monthly usage hours for heavy professional users.', 'Specialized for prose composition rather than programming code syntax.'],
        pricing_overview: '<p>Aqua Voice provides a free tier with daily dictation limits, with the <strong>Pro</strong> tier starting at $10/month for unlimited document dictation and priority processing. (SYNTHETIC TEST DATA)</p>',
        comparison_summary: '<p>Choose <strong>Aqua Voice</strong> for voice-first text editor composition. Consider <strong>Wispr Flow</strong> for global operating system dictation, or <strong>Otter.ai</strong> for meeting transcription.</p>',
        pricingModel: 'freemium',
        hasFreeTier: true,
        hasFreeTrial: false,
        freeAccessType: 'recurring_service',
        startingPrice: 10,
        priceCurrency: 'USD',
        billingPeriod: 'month',
        startingPlan: 'Pro',
        trialDays: null,
        apiAvailable: false,
        platforms: ['web', 'macos', 'ios'],
        verificationSources: ['https://aquavoice.com/'],
        evidence: [{ evidenceId: 'E9009', sourceURL: 'https://aquavoice.com/', reviewedAt: '2026-11-06', method: 'official_source_review', finding: 'Verified free tier and Pro plan starting at $10/month.' }]
      },
      'docsumo': {
        shortDescription: 'Docsumo is an intelligent document processing platform that automates data extraction from unstructured financial documents and forms.',
        sourceSummary: "Research-based profile using Docsumo official product and API pricing documentation reviewed on 6 November 2026. Features and plan limits are vendor-stated; no independent OCR accuracy or throughput benchmarks are claimed. (SYNTHETIC TEST DATA)",
        long_description: '<p>Docsumo is an automated document processing software engineered for financial services, lending institutions, and operations teams. It extracts tabular data and key-value fields from unstructured and semi-structured documents, including bank statements, invoices, and tax forms.</p><p>The platform combines optical character recognition (OCR) with machine learning validation models to verify data accuracy, detect document tampering, and flag calculation discrepancies.</p><p>Docsumo provides web validation interfaces alongside REST APIs for embedding automated document extraction into operational workflows.</p>',
        how_it_works: '<p>Operations teams upload PDF, image, or scanned documents via web upload, email forwarding, or automated API endpoints.</p><p>The OCR model identifies text, checkboxes, and multi-page tables, mapping values into standardized schema definitions.</p><p>Pre-configured business rules validate extracted calculations, routing questionable entries to human verification queues before syncing to ERP backends.</p>',
        feature_groups: [
          { group: 'Document Processing', items: ['Automated field extraction for bank statements, invoices, and paystubs.', 'Intelligent multi-page table capture with line-item reconciliation.', 'Fraud and document tampering detection algorithms.'] },
          { group: 'Data Validation', items: ['Pre-configured arithmetic validation rules checking subtotal sums.', 'Human-in-the-loop review interface with keyboard shortcut auditing.', 'Confidence scoring highlighting fields needing manual confirmation.'] },
          { group: 'System Integration', items: ['REST API and webhook triggers for automated document ingestion.', 'Direct export integrations with QuickBooks, Xero, and Zapier.', 'Enterprise security compliance with SOC 2 Type II and GDPR controls.'] }
        ],
        bestFor: ['Commercial lenders verifying borrower bank statements and tax records.', 'Accounts payable departments automating supplier invoice data entry.', 'Fintech companies automating customer onboarding document checks.'],
        notIdealFor: ['Individual consumers seeking simple single-page mobile receipt scanning.', 'Creative design studios converting scanned sketches into vector artwork.', 'Organizations seeking generic conversational chatbot tools.'],
        workflows: [
          { title: 'Lending bank statement audit', description: 'Extract and validate 12 months of borrower bank statements with automated transaction reconciliation.' },
          { title: 'Supplier invoice automation', description: 'Capture invoice line items and cross-check arithmetic totals against purchase orders automatically.' },
          { title: 'API document pipeline', description: 'Send customer tax returns to Docsumo APIs to receive standardized JSON data within backend workflows.' }
        ],
        pros: ['High extraction accuracy on complex financial tables and bank records.', 'Built-in arithmetic checks identify document discrepancies automatically.', 'Human-in-the-loop interface allows fast manual exceptions auditing.', 'Comprehensive REST APIs support scalable backend workflow integration.'],
        cons: ['Targeted and priced for business operations rather than small individual users.', 'Initial setup requires configuring extraction schemas for custom document types.', 'High volume document processing requires dedicated monthly operational budget.', 'Poor quality blurry physical mobile scans may require manual exception review.'],
        pricing_overview: '<p>Docsumo subscription pricing starts at $500/month for the <strong>Growth</strong> plan with 1,000 monthly document credits, and includes a 14-day evaluation trial. (SYNTHETIC TEST DATA)</p>',
        comparison_summary: '<p>Choose <strong>Docsumo</strong> for financial document table extraction and validation. Consider <strong>Nanonets</strong> for general OCR workflows, or <strong>Rossum</strong> for accounts payable enterprise routing.</p>',
        pricingModel: 'paid',
        hasFreeTier: false,
        hasFreeTrial: true,
        freeAccessType: 'trial_only',
        startingPrice: 500,
        priceCurrency: 'USD',
        billingPeriod: 'month',
        startingPlan: 'Growth',
        trialDays: 14,
        apiAvailable: true,
        platforms: ['web'],
        verificationSources: ['https://www.docsumo.com/', 'https://www.docsumo.com/pricing'],
        evidence: [{ evidenceId: 'E9010', sourceURL: 'https://www.docsumo.com/pricing', reviewedAt: '2026-11-06', method: 'official_source_review', finding: 'Verified Growth plan at $500/month for 1,000 document credits.' }]
      }
    }
  };
}

async function runScalabilityGate() {
  console.log('======================================================');
  console.log('WHICHAIPICK 10-TOOL PIPELINE SCALABILITY GATE (T.2.5)');
  console.log('Testing 10-Tool Cohort in ONE Batch: Dry-Run, Apply, QA');
  console.log('======================================================\n');

  // ── STEP 1: SAFETY PREFLIGHT ───────────────────────────────
  console.log('--- STEP 1: Safety & Preflight Invariant Checks ---');

  const toolsPath = path.join(ROOT, 'data', 'tools.json');
  const backlogPath = path.join(ROOT, 'data', 'content-enrichment-backlog.json');
  const monetisationPath = path.join(ROOT, 'data', 'monetisation.json');
  const sitemapPath = path.join(ROOT, 'sitemap.xml');

  const initialTools = JSON.parse(fs.readFileSync(toolsPath, 'utf8'));
  const initialBacklog = JSON.parse(fs.readFileSync(backlogPath, 'utf8'));
  const initialMonetisation = JSON.parse(fs.readFileSync(monetisationPath, 'utf8'));
  const initialSitemap = fs.readFileSync(sitemapPath, 'utf8');

  assert(initialTools.length === 882, 'Total catalogue tools invariant: 882');
  const initialEligible = initialTools.filter(t => t.recommendationEligible !== false).length;
  assert(initialEligible === 879, 'Recommendation eligible tools invariant: 879');
  assert(initialMonetisation.adsEnabled === false, 'Monetisation setting invariant: adsEnabled === false');
  assert(initialBacklog.counts.v2Structured === 46, 'Backlog V2 count invariant: 46');
  assert(initialBacklog.counts.richV1 === 302, 'Backlog Rich V1 count invariant: 302');
  assert(initialBacklog.counts.skeletalV1 === 531, 'Backlog Skeletal V1 count invariant: 531');

  const initialUrlCount = (initialSitemap.match(/<loc>/g) || []).length;
  assert(initialUrlCount === 959, 'Sitemap URL count invariant: 959');

  // Snapshot tracked file hashes to guarantee zero mutation of candidate worktree
  const trackedFileSnapshots = new Map();
  const criticalTrackedFiles = [
    'data/tools.json',
    'data/tools.phase11.staged.json',
    'data/WhichAIPick_Catalog_PHASE11_ANTIGRAVITY_IMPORT_CONTRACT_COMPLETE_2026-10-01.xlsx',
    'data/evidence/phase11-evidence-ledger.json',
    'data/comparison-index.json',
    'data/content-enrichment-backlog.json',
    'sitemap.xml'
  ];
  for (const rel of criticalTrackedFiles) {
    trackedFileSnapshots.set(rel, computeFileHash(path.join(ROOT, rel)));
  }

  // ── STEP 2: TEST COHORT DEFINITION ─────────────────────────
  console.log('\n--- STEP 2: 10-Tool Cohort Verification ---');
  const payload10 = create10ToolSyntheticPayload();
  assert(payload10.targetToolIds.length === 10, 'Target tools count is exactly 10');
  assert(new Set(payload10.targetToolIds).size === 10, 'All 10 target tool IDs are distinct');

  for (const id of payload10.targetToolIds) {
    const t = initialTools.find(x => x.id === id);
    assert(t !== undefined, `Target tool "${id}" exists in catalogue`);
    assert(initialBacklog.skeletalBacklogToolIds.includes(id), `Target tool "${id}" is in skeletalBacklogToolIds`);
  }

  // ── STEP 3: SANDBOX EXECUTION (13 STEPS) ────────────────────
  console.log('\n--- STEP 3: Sandbox Execution (10 Tools in ONE Batch) ---');
  const sandboxDir = createSandbox();
  console.log(`  Isolated Sandbox created at: ${sandboxDir}`);

  const timings = {};

  try {
    const batchPath = path.join(sandboxDir, 'batch-10-tools.json');
    fs.writeFileSync(batchPath, JSON.stringify(payload10, null, 2), 'utf8');

    // 1. Contract validation
    const t0Contract = Date.now();
    const sandboxTools = JSON.parse(fs.readFileSync(path.join(sandboxDir, 'data', 'tools.json'), 'utf8'));
    const sandboxBacklog = JSON.parse(fs.readFileSync(path.join(sandboxDir, 'data', 'content-enrichment-backlog.json'), 'utf8'));
    const contractResult = validateBatch(payload10, {
      mode: 'new',
      batchFilePath: batchPath,
      toolsCatalog: sandboxTools,
      backlogManifest: sandboxBacklog
    });
    timings.contractValidationMs = Date.now() - t0Contract;
    assert(contractResult.isValid === true, `Step 1: Batch contract validated for 10 tools (${timings.contractValidationMs}ms)`);
    assert(contractResult.errorCount === 0, 'Step 1: 0 contract errors across all 10 tools');

    // 2. NEW mode dry-run
    const t0DryRun = Date.now();
    const preDryRunHashes = {
      tools: computeFileHash(path.join(sandboxDir, 'data', 'tools.json')),
      staged: computeFileHash(path.join(sandboxDir, 'data', 'tools.phase11.staged.json')),
      workbook: computeFileHash(path.join(sandboxDir, 'data', 'WhichAIPick_Catalog_PHASE11_ANTIGRAVITY_IMPORT_CONTRACT_COMPLETE_2026-10-01.xlsx')),
      ledger: computeFileHash(path.join(sandboxDir, 'data', 'evidence', 'phase11-evidence-ledger.json')),
      index: computeFileHash(path.join(sandboxDir, 'data', 'comparison-index.json')),
      backlog: computeFileHash(path.join(sandboxDir, 'data', 'content-enrichment-backlog.json'))
    };

    const dryRunResult = await applyEnrichment({
      batchPath: 'batch-10-tools.json',
      mode: 'new',
      dryRun: true,
      workspaceRoot: sandboxDir,
      verbose: false
    });
    timings.dryRunMs = Date.now() - t0DryRun;
    assert(dryRunResult.success === true, `Step 2: Dry-run passed for 10 tools (${timings.dryRunMs}ms)`);
    assert(dryRunResult.dryRun === true, 'Step 2: dryRun reported as true');

    // 3. Zero-write verification
    const postDryRunHashes = {
      tools: computeFileHash(path.join(sandboxDir, 'data', 'tools.json')),
      staged: computeFileHash(path.join(sandboxDir, 'data', 'tools.phase11.staged.json')),
      workbook: computeFileHash(path.join(sandboxDir, 'data', 'WhichAIPick_Catalog_PHASE11_ANTIGRAVITY_IMPORT_CONTRACT_COMPLETE_2026-10-01.xlsx')),
      ledger: computeFileHash(path.join(sandboxDir, 'data', 'evidence', 'phase11-evidence-ledger.json')),
      index: computeFileHash(path.join(sandboxDir, 'data', 'comparison-index.json')),
      backlog: computeFileHash(path.join(sandboxDir, 'data', 'content-enrichment-backlog.json'))
    };
    const zeroWrites = Object.keys(preDryRunHashes).every(k => preDryRunHashes[k] === postDryRunHashes[k]);
    assert(zeroWrites === true, 'Step 3: SHA-256 confirmed 100% zero file writes during 10-tool dry-run');

    // 4. NEW mode APPLY in sandbox
    const t0Apply = Date.now();
    const applyResult = await applyEnrichment({
      batchPath: 'batch-10-tools.json',
      mode: 'new',
      apply: true,
      workspaceRoot: sandboxDir,
      verbose: false
    });
    timings.applyTransactionMs = Date.now() - t0Apply;
    assert(applyResult.success === true, `Step 4: 10-tool apply transaction committed safely (${timings.applyTransactionMs}ms)`);
    assert(applyResult.enrichedCount === 10, 'Step 4: Exactly 10 tools enriched in atomic transaction');

    // 5. Excel workbook synchronization
    const postWb = XLSX.readFile(path.join(sandboxDir, 'data', 'WhichAIPick_Catalog_PHASE11_ANTIGRAVITY_IMPORT_CONTRACT_COMPLETE_2026-10-01.xlsx'));
    const postWbRows = XLSX.utils.sheet_to_json(postWb.Sheets['Catalog'], { defval: null });
    const targetRows = postWbRows.filter(r => payload10.targetToolIds.includes(r.id));
    assert(targetRows.length === 10, 'Step 5: Exactly 10 target tool rows located in workbook Catalog sheet');
    const allWbUpdated = targetRows.every(r => r.editorialStatus === 'source_based_summary');
    assert(allWbUpdated === true, 'Step 5: All 10 workbook rows updated with editorialStatus="source_based_summary"');

    // 6 & 7. Canonical import and JSON parity
    const postTools = JSON.parse(fs.readFileSync(path.join(sandboxDir, 'data', 'tools.json'), 'utf8'));
    const postStaged = JSON.parse(fs.readFileSync(path.join(sandboxDir, 'data', 'tools.phase11.staged.json'), 'utf8'));
    const toolsHash = computeFileHash(path.join(sandboxDir, 'data', 'tools.json'));
    const stagedHash = computeFileHash(path.join(sandboxDir, 'data', 'tools.phase11.staged.json'));
    assert(toolsHash === stagedHash, 'Steps 6 & 7: tools.json and staged.json maintain 100% byte-for-byte parity');

    // 8. Evidence ledger synchronization
    const postLedger = JSON.parse(fs.readFileSync(path.join(sandboxDir, 'data', 'evidence', 'phase11-evidence-ledger.json'), 'utf8'));
    const expectedEvidenceIds = ['E9001', 'E9002', 'E9003', 'E9004', 'E9005', 'E9006', 'E9007', 'E9008', 'E9009', 'E9010'];
    const allEvidencePresent = expectedEvidenceIds.every(evId => postLedger.some(e => e.evidenceId === evId));
    assert(allEvidencePresent === true, 'Step 8: All 10 new evidence records (E9001-E9010) present in ledger');
    assert(postLedger.length === 1331 + 10, 'Step 8: Ledger count incremented by exactly 10 (1331 -> 1341)');

    // 9. Comparison index regeneration
    const postCompIndex = JSON.parse(fs.readFileSync(path.join(sandboxDir, 'data', 'comparison-index.json'), 'utf8'));
    assert(postCompIndex.length === 882, 'Step 9: Comparison index preserves exactly 882 tools');
    const allInIndex = payload10.targetToolIds.every(id => postCompIndex.some(e => e.id === id));
    assert(allInIndex === true, 'Step 9: All 10 enriched tools present in comparison index');

    // 10. Backlog reconciliation
    const postBacklog = JSON.parse(fs.readFileSync(path.join(sandboxDir, 'data', 'content-enrichment-backlog.json'), 'utf8'));
    assert(postBacklog.counts.totalTools === 882, 'Step 10: Backlog total tools invariant: 882');
    assert(postBacklog.counts.v2Structured === 46, 'Step 10: Backlog V2 count invariant: 46');
    assert(postBacklog.counts.richV1 === 312, 'Step 10: Backlog Rich V1 count incremented by 10 (302 -> 312)');
    assert(postBacklog.counts.skeletalV1 === 521, 'Step 10: Backlog Skeletal V1 count decremented by 10 (531 -> 521)');
    const noneInSkeletalBacklog = payload10.targetToolIds.every(id => !postBacklog.skeletalBacklogToolIds.includes(id));
    assert(noneInSkeletalBacklog === true, 'Step 10: All 10 tools removed from skeletalBacklogToolIds');

    // 11. Static HTML generation
    const t0StaticGen = Date.now();
    execSync('node scripts/generate-static-pages.mjs', { cwd: sandboxDir, env: EXEC_ENV, stdio: 'pipe' });
    timings.staticGenerationMs = Date.now() - t0StaticGen;
    console.log(`  Static pages generated in ${timings.staticGenerationMs}ms`);
    const allHtmlExist = payload10.targetToolIds.every(id => fs.existsSync(path.join(sandboxDir, 'tools', id, 'index.html')));
    assert(allHtmlExist === true, 'Step 11: Static HTML generated for all 10 tool profiles');

    // 12. Header/footer injection
    const t0Injection = Date.now();
    execSync('node scripts/inject-header.mjs && node scripts/inject-footer.mjs', { cwd: sandboxDir, env: EXEC_ENV, stdio: 'pipe' });
    timings.injectionMs = Date.now() - t0Injection;
    console.log(`  Header/footer injected in ${timings.injectionMs}ms`);
    const allInjected = payload10.targetToolIds.every(id => {
      const html = fs.readFileSync(path.join(sandboxDir, 'tools', id, 'index.html'), 'utf8');
      return (html.includes('class="main-nav"') || html.includes('site-header')) && html.includes('class="site-footer"');
    });
    assert(allInjected === true, 'Step 12: Header and footer injected into all 10 generated pages');

    // 13. Generic Playwright acceptance testing for all 10 tools
    console.log('  Running generic Playwright acceptance harness on all 10 newly generated pages...');
    const t0Playwright = Date.now();
    const qaResult = await runBatchAcceptance({
      batchPayload: payload10,
      workspaceRoot: sandboxDir,
      verbose: false
    });
    timings.playwrightQaMs = Date.now() - t0Playwright;
    console.log(`  Playwright QA completed in ${timings.playwrightQaMs}ms`);
    assert(qaResult.success === true, 'Step 13: Generic Playwright acceptance harness passed (success: true)');
    assert(qaResult.auditedTools.length === 10, 'Step 13: Exactly 10 tools audited by Playwright harness');
    assert(qaResult.failedChecks === 0, `Step 13: Zero assertion failures across all 10 tools (${qaResult.passedChecks} passed checks)`);

    // ── STEP 4: DEEP DATA INTEGRITY VERIFICATION ───────────────
    console.log('\n--- STEP 4: Deep Data Integrity Verification ---');

    // 4.1 Non-target tools immutability
    const origTools = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'tools.json'), 'utf8'));
    const targetSet = new Set(payload10.targetToolIds);
    let nonTargetMismatches = 0;
    for (const tool of postTools) {
      if (!targetSet.has(tool.id)) {
        const orig = origTools.find(t => t.id === tool.id);
        if (JSON.stringify(tool) !== JSON.stringify(orig)) {
          nonTargetMismatches++;
        }
      }
    }
    assert(nonTargetMismatches === 0, 'Deep Check: Exactly 872 non-target tools are 100% untouched');

    // 4.2 Non-target workbook rows immutability
    const origWb = XLSX.readFile(path.join(ROOT, 'data', 'WhichAIPick_Catalog_PHASE11_ANTIGRAVITY_IMPORT_CONTRACT_COMPLETE_2026-10-01.xlsx'));
    const origWbRows = XLSX.utils.sheet_to_json(origWb.Sheets['Catalog'], { defval: null });
    let nonTargetWbMismatches = 0;
    for (const row of postWbRows) {
      if (!targetSet.has(row.id)) {
        const origRow = origWbRows.find(r => r.id === row.id);
        if (JSON.stringify(row) !== JSON.stringify(origRow)) {
          nonTargetWbMismatches++;
        }
      }
    }
    assert(nonTargetWbMismatches === 0, 'Deep Check: Exactly 872 non-target workbook rows are 100% untouched');

    // 4.3 Nested editorial fields and transparency checks on all 10 tools
    for (const id of payload10.targetToolIds) {
      const tool = postTools.find(t => t.id === id);
      const html = fs.readFileSync(path.join(sandboxDir, 'tools', id, 'index.html'), 'utf8');

      assert(tool.editorialStatus === 'source_based_summary', `Deep Check [${id}]: editorialStatus === "source_based_summary"`);
      assert(Array.isArray(tool.workflows) && tool.workflows.length === 3, `Deep Check [${id}]: exactly 3 workflows attached`);
      assert(Array.isArray(tool.feature_groups) && tool.feature_groups.length === 3, `Deep Check [${id}]: exactly 3 feature groups attached`);
      assert(Array.isArray(tool.pros) && tool.pros.length === 4, `Deep Check [${id}]: exactly 4 pros attached`);
      assert(Array.isArray(tool.cons) && tool.cons.length === 4, `Deep Check [${id}]: exactly 4 cons attached`);

      assert(html.includes('class="tool-source-summary"'), `Deep Check [${id}]: .tool-source-summary rendered in HTML`);
      assert(html.includes('ol class="tool-workflow-list"'), `Deep Check [${id}]: <ol class="tool-workflow-list"> rendered in HTML`);
      assert(!html.includes('<p><p>'), `Deep Check [${id}]: zero invalid nested paragraphs`);
    }

  } finally {
    cleanupSandbox(sandboxDir);
    console.log('  Cleaned up main 10-tool sandbox workspace.');
  }

  // ── STEP 6: BATCH FAILURE & ROLLBACK TESTS (9 SCENARIOS) ─────
  console.log('\n--- STEP 6: Batch Failure & Rollback Tests (9 Scenarios) ---');

  // Scenario 1: Duplicate tool IDs in payload
  console.log('\n[Failure Scenario 1] Duplicate Tool IDs in Batch Payload');
  {
    const failSandbox = createSandbox();
    try {
      const badPayload = create10ToolSyntheticPayload();
      badPayload.targetToolIds[9] = badPayload.targetToolIds[0]; // Duplicate first tool ID at position 9
      const badPath = path.join(failSandbox, 'dup.json');
      fs.writeFileSync(badPath, JSON.stringify(badPayload, null, 2), 'utf8');

      const preHash = computeFileHash(path.join(failSandbox, 'data', 'tools.json'));
      let threw = false;
      try {
        await applyEnrichment({ batchPath: 'dup.json', mode: 'new', apply: true, workspaceRoot: failSandbox, verbose: false });
      } catch (err) {
        threw = true;
        assert(err.message.includes('TARGET_ID_DUPLICATE') || err.message.includes('Contract validation failed'), 'Scenario 1: Flagged TARGET_ID_DUPLICATE defect code');
      }
      assert(threw === true, 'Scenario 1: Duplicate tool IDs rejected in preflight');
      const postHash = computeFileHash(path.join(failSandbox, 'data', 'tools.json'));
      assert(preHash === postHash, 'Scenario 1: tools.json remained 100% untouched');
    } finally {
      cleanupSandbox(failSandbox);
    }
  }

  // Scenario 2: Cross-target evidence ID collision
  console.log('\n[Failure Scenario 2] Cross-Target Evidence ID Collision');
  {
    const failSandbox = createSandbox();
    try {
      const badPayload = create10ToolSyntheticPayload();
      // Tool 2 steals Tool 1's evidence ID E9001
      badPayload.tools['adwisely'].evidence[0].evidenceId = 'E9001';
      const badPath = path.join(failSandbox, 'ev-coll.json');
      fs.writeFileSync(badPath, JSON.stringify(badPayload, null, 2), 'utf8');

      let threw = false;
      try {
        await applyEnrichment({ batchPath: 'ev-coll.json', mode: 'new', apply: true, workspaceRoot: failSandbox, verbose: false });
      } catch (err) {
        threw = true;
        assert(err.message.includes('EVIDENCE_ID_DUPLICATE') || err.message.includes('Contract validation failed') || err.message.includes('collision'), 'Scenario 2: Flagged evidence ID collision');
      }
      assert(threw === true, 'Scenario 2: Cross-target evidence collision rejected before writes');
    } finally {
      cleanupSandbox(failSandbox);
    }
  }

  // Scenario 3: One invalid profile among 9 valid ones (Tool 5 invalid)
  console.log('\n[Failure Scenario 3] One Invalid Profile Among 9 Valid Profiles (Tool 5 Corrupted)');
  {
    const failSandbox = createSandbox();
    try {
      const badPayload = create10ToolSyntheticPayload();
      badPayload.tools['abridge'].feature_groups = []; // Empty feature groups (defect)
      const badPath = path.join(failSandbox, 'bad-tool5.json');
      fs.writeFileSync(badPath, JSON.stringify(badPayload, null, 2), 'utf8');

      const preHash = computeFileHash(path.join(failSandbox, 'data', 'tools.json'));
      let threw = false;
      try {
        await applyEnrichment({ batchPath: 'bad-tool5.json', mode: 'new', apply: true, workspaceRoot: failSandbox, verbose: false });
      } catch (err) {
        threw = true;
        assert(err.message.includes('FEATURE_GROUPS_COUNT') || err.message.includes('Contract validation failed'), 'Scenario 3: Flagged tool 5 contract failure');
      }
      assert(threw === true, 'Scenario 3: Whole 10-tool batch aborted due to single tool defect');
      const postHash = computeFileHash(path.join(failSandbox, 'data', 'tools.json'));
      assert(preHash === postHash, 'Scenario 3: Zero tools written (all 10 prevented from partial application)');
    } finally {
      cleanupSandbox(failSandbox);
    }
  }

  // Scenario 4: Invalid pricing on the final tool (Tool 10)
  console.log('\n[Failure Scenario 4] Invalid Pricing on Final Tool (Tool 10)');
  {
    const failSandbox = createSandbox();
    try {
      const badPayload = create10ToolSyntheticPayload();
      // Contradictory pricing on tool 10 (docsumo)
      badPayload.tools['docsumo'].hasFreeTier = true;
      badPayload.tools['docsumo'].pricing_overview = '<p>Docsumo requires a paid plan with no free tier available. (SYNTHETIC TEST DATA)</p>';
      const badPath = path.join(failSandbox, 'bad-pricing10.json');
      fs.writeFileSync(badPath, JSON.stringify(badPayload, null, 2), 'utf8');

      let threw = false;
      try {
        await applyEnrichment({ batchPath: 'bad-pricing10.json', mode: 'new', apply: true, workspaceRoot: failSandbox, verbose: false });
      } catch (err) {
        threw = true;
        assert(err.message.includes('PRICING_CONTRADICTORY_PAID_ONLY') || err.message.includes('Contract validation failed'), 'Scenario 4: Flagged tool 10 pricing contradiction');
      }
      assert(threw === true, 'Scenario 4: Aborted 10-tool batch before writes due to final tool defect');
    } finally {
      cleanupSandbox(failSandbox);
    }
  }

  // Scenario 5: Workbook import failure triggers clean rollback for all 10 tools
  console.log('\n[Failure Scenario 5] Workbook Import Crash Triggers 10-Tool Rollback');
  {
    const failSandbox = createSandbox();
    try {
      const payload = create10ToolSyntheticPayload();
      const pPath = path.join(failSandbox, 'payload.json');
      fs.writeFileSync(pPath, JSON.stringify(payload, null, 2), 'utf8');

      // Sabotage canonical workbook import script
      const impPath = path.join(failSandbox, 'scripts', 'import-phase11-workbook.mjs');
      fs.writeFileSync(impPath, 'throw new Error("SIMULATED_WORKBOOK_IMPORT_CRASH_SCENARIO_5");', 'utf8');

      const preToolsHash = computeFileHash(path.join(failSandbox, 'data', 'tools.json'));
      const preWbHash = computeFileHash(path.join(failSandbox, 'data', 'WhichAIPick_Catalog_PHASE11_ANTIGRAVITY_IMPORT_CONTRACT_COMPLETE_2026-10-01.xlsx'));

      let threw = false;
      try {
        await applyEnrichment({ batchPath: 'payload.json', mode: 'new', apply: true, workspaceRoot: failSandbox, verbose: false });
      } catch (err) {
        threw = true;
        assert(err.message.includes('SIMULATED_WORKBOOK_IMPORT_CRASH_SCENARIO_5') || err.message.includes('ENGINE TRANSACTION ABORTED'), 'Scenario 5: Transaction abort caught');
      }
      assert(threw === true, 'Scenario 5: Engine aborted on import crash');

      const postToolsHash = computeFileHash(path.join(failSandbox, 'data', 'tools.json'));
      const postWbHash = computeFileHash(path.join(failSandbox, 'data', 'WhichAIPick_Catalog_PHASE11_ANTIGRAVITY_IMPORT_CONTRACT_COMPLETE_2026-10-01.xlsx'));

      assert(preToolsHash === postToolsHash, 'Scenario 5: tools.json 100% rolled back to pristine baseline');
      assert(preWbHash === postWbHash, 'Scenario 5: Workbook 100% rolled back to pristine baseline');
    } finally {
      cleanupSandbox(failSandbox);
    }
  }

  // Scenario 6: Partial multi-tool transaction failure (crash in step 6)
  console.log('\n[Failure Scenario 6] Partial Multi-Tool Transaction Failure & Rollback');
  {
    const failSandbox = createSandbox();
    try {
      const payload = create10ToolSyntheticPayload();
      const pPath = path.join(failSandbox, 'payload.json');
      fs.writeFileSync(pPath, JSON.stringify(payload, null, 2), 'utf8');

      // Sabotage step 6 (scripts/generate-comparison-index.mjs)
      const compPath = path.join(failSandbox, 'scripts', 'generate-comparison-index.mjs');
      fs.writeFileSync(compPath, 'throw new Error("SIMULATED_STEP_6_CRASH");', 'utf8');

      const preHashes = {
        tools: computeFileHash(path.join(failSandbox, 'data', 'tools.json')),
        staged: computeFileHash(path.join(failSandbox, 'data', 'tools.phase11.staged.json')),
        workbook: computeFileHash(path.join(failSandbox, 'data', 'WhichAIPick_Catalog_PHASE11_ANTIGRAVITY_IMPORT_CONTRACT_COMPLETE_2026-10-01.xlsx')),
        ledger: computeFileHash(path.join(failSandbox, 'data', 'evidence', 'phase11-evidence-ledger.json')),
        index: computeFileHash(path.join(failSandbox, 'data', 'comparison-index.json')),
        backlog: computeFileHash(path.join(failSandbox, 'data', 'content-enrichment-backlog.json'))
      };

      let threw = false;
      try {
        await applyEnrichment({ batchPath: 'payload.json', mode: 'new', apply: true, workspaceRoot: failSandbox, verbose: false });
      } catch (err) {
        threw = true;
        assert(err.message.includes('SIMULATED_STEP_6_CRASH') || err.message.includes('ENGINE TRANSACTION ABORTED'), 'Scenario 6: Caught mid-transaction abort');
      }
      assert(threw === true, 'Scenario 6: Mid-transaction crash aborted cleanly');

      const postHashes = {
        tools: computeFileHash(path.join(failSandbox, 'data', 'tools.json')),
        staged: computeFileHash(path.join(failSandbox, 'data', 'tools.phase11.staged.json')),
        workbook: computeFileHash(path.join(failSandbox, 'data', 'WhichAIPick_Catalog_PHASE11_ANTIGRAVITY_IMPORT_CONTRACT_COMPLETE_2026-10-01.xlsx')),
        ledger: computeFileHash(path.join(failSandbox, 'data', 'evidence', 'phase11-evidence-ledger.json')),
        index: computeFileHash(path.join(failSandbox, 'data', 'comparison-index.json')),
        backlog: computeFileHash(path.join(failSandbox, 'data', 'content-enrichment-backlog.json'))
      };

      const allRestored = Object.keys(preHashes).every(k => preHashes[k] === postHashes[k]);
      assert(allRestored === true, 'Scenario 6: All 6 transaction assets 100% restored to baseline via rollback');

      // Verify no dangling backup folder remains
      const dangling = fs.readdirSync(failSandbox).filter(f => f.startsWith('.enrichment-backup-'));
      assert(dangling.length === 0, 'Scenario 6: Safety backup folder unlinked after rollback');
    } finally {
      cleanupSandbox(failSandbox);
    }
  }

  // Scenario 7: Evidence ledger write failure
  console.log('\n[Failure Scenario 7] Evidence Ledger Cross-Tool Collision in Preflight');
  {
    const failSandbox = createSandbox();
    try {
      const payload = create10ToolSyntheticPayload();
      // Make tool 1 evidence collide with existing ledger entry E0001 (10web)
      payload.tools['ai-studios'].evidence[0].evidenceId = 'E0001';
      const pPath = path.join(failSandbox, 'payload.json');
      fs.writeFileSync(pPath, JSON.stringify(payload, null, 2), 'utf8');

      let threw = false;
      try {
        await applyEnrichment({ batchPath: 'payload.json', mode: 'new', apply: true, workspaceRoot: failSandbox, verbose: false });
      } catch (err) {
        threw = true;
        assert(err.message.includes('Evidence ID collision') || err.message.includes('E0001'), 'Scenario 7: Detected ledger collision with E0001');
      }
      assert(threw === true, 'Scenario 7: Preflight blocked write on ledger collision');
    } finally {
      cleanupSandbox(failSandbox);
    }
  }

  // Scenario 8: Second identical application fails closed
  console.log('\n[Failure Scenario 8] Second Identical 10-Tool Application Fails Closed');
  {
    const failSandbox = createSandbox();
    try {
      const payload = create10ToolSyntheticPayload();
      const pPath = path.join(failSandbox, 'payload.json');
      fs.writeFileSync(pPath, JSON.stringify(payload, null, 2), 'utf8');

      // First run: succeeds
      const firstRes = await applyEnrichment({ batchPath: 'payload.json', mode: 'new', apply: true, workspaceRoot: failSandbox, verbose: false });
      assert(firstRes.success === true, 'Scenario 8: First 10-tool application succeeded');

      // Second run: must fail closed because all 10 are now Rich V1
      let threw = false;
      try {
        await applyEnrichment({ batchPath: 'payload.json', mode: 'new', apply: true, workspaceRoot: failSandbox, verbose: false });
      } catch (err) {
        threw = true;
        assert(err.message.includes('TARGET_NOT_SKELETAL_V1'), 'Scenario 8: Flagged TARGET_NOT_SKELETAL_V1 on second application');
      }
      assert(threw === true, 'Scenario 8: Second identical 10-tool application refused');
    } finally {
      cleanupSandbox(failSandbox);
    }
  }

  // Scenario 9: Recovery after handled exception leaves sandbox ready for subsequent valid batch
  console.log('\n[Failure Scenario 9] Recovery After Handled Exception Permits Subsequent Valid Batch');
  {
    const failSandbox = createSandbox();
    try {
      // Step A: Attempt invalid batch
      const badPayload = create10ToolSyntheticPayload();
      badPayload.tools['ai-studios'].feature_groups = [];
      const badPath = path.join(failSandbox, 'bad.json');
      fs.writeFileSync(badPath, JSON.stringify(badPayload, null, 2), 'utf8');

      let failedFirst = false;
      try {
        await applyEnrichment({ batchPath: 'bad.json', mode: 'new', apply: true, workspaceRoot: failSandbox, verbose: false });
      } catch (e) {
        failedFirst = true;
      }
      assert(failedFirst === true, 'Scenario 9: First bad attempt correctly failed');

      // Step B: Attempt valid batch immediately in same sandbox
      const goodPayload = create10ToolSyntheticPayload();
      const goodPath = path.join(failSandbox, 'good.json');
      fs.writeFileSync(goodPath, JSON.stringify(goodPayload, null, 2), 'utf8');

      const secondRes = await applyEnrichment({ batchPath: 'good.json', mode: 'new', apply: true, workspaceRoot: failSandbox, verbose: false });
      assert(secondRes.success === true, 'Scenario 9: Subsequent valid 10-tool batch applied cleanly after rollback');
      assert(secondRes.enrichedCount === 10, 'Scenario 9: Exactly 10 tools enriched on second attempt');
    } finally {
      cleanupSandbox(failSandbox);
    }
  }

  // ── STEP 7: CANDIDATE WORKTREE INVARIANCE CHECK ─────────────
  console.log('\n--- STEP 7: Candidate Worktree Invariance Check ---');
  let trackedMutations = 0;
  for (const [rel, origHash] of trackedFileSnapshots.entries()) {
    const currentHash = computeFileHash(path.join(ROOT, rel));
    if (origHash !== currentHash) {
      console.error(`  ❌ Tracked file modified: ${rel}`);
      trackedMutations++;
    }
  }
  assert(trackedMutations === 0, 'Zero tracked files in candidate worktree modified during test execution');

  console.log('\n======================================================');
  console.log(`TOTAL SCALABILITY GATE CHECKS: ${totalChecks} | PASSED: ${passedChecks} | FAILED: ${failedChecks}`);
  console.log('TIMING SUMMARY:');
  console.log(`  - Contract Validation (10 tools):  ${timings.contractValidationMs || 0}ms`);
  console.log(`  - Dry-Run Simulation (10 tools):   ${timings.dryRunMs || 0}ms`);
  console.log(`  - Apply Transaction (10 tools):    ${timings.applyTransactionMs || 0}ms`);
  console.log(`  - Static HTML Generation (322 p):  ${timings.staticGenerationMs || 0}ms`);
  console.log(`  - Header/Footer Stamping:          ${timings.injectionMs || 0}ms`);
  console.log(`  - Playwright QA (10 tools x 3 vp): ${timings.playwrightQaMs || 0}ms`);
  console.log('======================================================');

  if (failedChecks === 0) {
    console.log('🎉 ALL 10-TOOL PIPELINE SCALABILITY GATE TESTS PASSED CLEANLY!');
    console.log('======================================================\n');
    process.exit(0);
  } else {
    console.error('❌ SCALABILITY GATE TESTS FAILED!');
    console.log('======================================================\n');
    process.exit(1);
  }
}

// Run CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runScalabilityGate().catch(err => {
    console.error('[FATAL SCALABILITY GATE ERROR]', err);
    process.exit(1);
  });
}
