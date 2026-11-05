import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { execSync } from 'child_process';

const WORKTREE_ROOT = process.cwd();
const TOOLS_JSON_PATH = path.join(WORKTREE_ROOT, 'data/tools.json');
const STAGED_JSON_PATH = path.join(WORKTREE_ROOT, 'data/tools.phase11.staged.json');
const WORKBOOK_PATH = path.join(WORKTREE_ROOT, 'data/WhichAIPick_Catalog_PHASE11_ANTIGRAVITY_IMPORT_CONTRACT_COMPLETE_2026-10-01.xlsx');
const LEDGER_PATH = path.join(WORKTREE_ROOT, 'data/evidence/phase11-evidence-ledger.json');

export const ENRICHMENTS = {
  castmagic: {
    shortDescription: 'Turn audio and video recordings into transcripts, show notes, articles, social posts and other reusable content.',
    sourceSummary: "Source-researched from Castmagic's official product, pricing and privacy documentation on 5 November 2026; no firsthand testing claimed.",
    long_description: `<p>Castmagic is an AI-powered content repurposing workspace designed around existing audio and video recordings. It helps podcasters, marketers, educators and media teams transform spoken material into written content, promotional assets and searchable resources.</p><p>After a recording is imported, Castmagic can create transcripts, summaries, show notes, newsletters, blog drafts, social posts and suggested highlights. Its reusable prompts and collaborative Spaces help teams create multiple formats from the same source rather than starting each piece of content from scratch.</p><p>Castmagic is primarily a post-recording content production platform. Although it includes media clipping tools, it should not be mistaken for a complete professional video-editing workstation.</p>`,
    how_it_works: `<p>Users import an existing recording or connect a supported content source, such as a podcast feed or video platform. Castmagic transcribes the material, identifies speakers and timestamps, and makes the transcript available for searching, editing and reuse.</p><p>Users select content templates or provide their own prompts to generate articles, show notes, newsletters or promotional copy. They can refine drafts using Magic Chat, organise projects into Spaces and create selected clips or audiograms.</p><p>Generated material still needs editorial checking. Automatic transcription can mishear names, technical terms or unclear speech, and generated summaries may omit important context.</p>`,
    feature_groups: [
      {
        group: 'Recording transcription and content library',
        items: [
          'Timestamped, speaker-labelled transcripts',
          'Support for more than 60 languages',
          'Imports from files and supported recording or publishing services'
        ]
      },
      {
        group: 'Content generation and repurposing',
        items: [
          'Custom prompts, show notes, newsletters, blog drafts and social posts',
          'Clips, carousels and audiograms created from existing recordings'
        ]
      },
      {
        group: 'Collaboration and integrations',
        items: [
          'Project Spaces, shared recording libraries and Magic Chat',
          'RSS-based workflows, Zapier and API integrations on qualifying plans'
        ]
      }
    ],
    bestFor: [
      'Podcasters turning episodes into written and social content.',
      'Marketing teams repurposing webinars, interviews and long-form video.',
      'Content agencies managing several recording libraries and repeatable production workflows.'
    ],
    notIdealFor: [
      'Users needing sophisticated multitrack audio or video timeline editing.',
      'People who want a permanent free content-creation plan.',
      'Buyers expecting transcription-hour allowances to reset every month.'
    ],
    workflows: [
      {
        title: 'Podcast publishing',
        description: 'Import a recorded episode, produce a transcript and draft show notes, then prepare a newsletter and selected social posts for editorial review.'
      },
      {
        title: 'Webinar repurposing',
        description: 'Upload a webinar, identify key discussion points and turn them into blog sections, short highlights and a follow-up email.'
      },
      {
        title: 'Client content production',
        description: 'Organise recordings in separate Spaces, apply reusable prompts and review draft outputs before delivering them to different clients.'
      }
    ],
    pros: [
      'Turns a single recording into multiple reusable content formats.',
      'Supports custom prompts and repeatable publishing workflows.',
      'Provides searchable transcripts and shared project organisation.',
      'Includes media repurposing capabilities alongside written content generation.'
    ],
    cons: [
      'Generated content needs fact-checking and tone editing.',
      'Not a replacement for advanced multitrack editing software.',
      'No permanent free subscription tier.',
      'Additional transcription capacity and plan-specific integrations may affect costs.'
    ],
    pricing_overview: `<p>Castmagic offers paid Hobby, Starter, Team and larger Business &amp; Scale plans, with a trial option.</p><p>Hobby costs <strong>$29/month on monthly billing</strong> or <strong>$239/year</strong> paid annually. Starter costs <strong>$69/month</strong> or <strong>$579/year</strong>. Team costs <strong>$199/month</strong> or <strong>$1,669/year</strong>, with five included seats. Business &amp; Scale pricing starts from advertised higher-volume rates and may require discussing specific requirements with sales.</p><p>The most important limitation is that included transcription hours are <strong>library totals</strong>, not monthly allowances. Hobby includes 30 hours, Starter 100 hours and Team 400 hours. Extra hours can be purchased.</p><p>The website displays rounded-down monthly equivalents for annual plans, so buyers should rely on the exact annual amount charged. API availability is listed for Starter and Team in the feature comparison, although buyers should confirm their required access because the vendor's FAQ emphasises API workflows for teams.</p>`,
    comparison_summary: `<p>Choose <strong>Castmagic</strong> when the goal is to turn recorded conversations and presentations into multiple publishing assets.</p><p>Consider <strong>Descript</strong> when detailed transcript-based audio and video editing is more important. Consider <strong>Riverside</strong> when recording quality and remote studio capture are the main priorities. Consider <strong>OpusClip</strong> when automated short-form video clipping is your central requirement.</p><p>Castmagic makes the most sense when your bottleneck is creating and organising useful content after recording.</p>`,
    pricingModel: 'paid',
    hasFreeTier: false,
    hasFreeTrial: true,
    startingPrice: null,
    priceCurrency: null,
    billingPeriod: null,
    startingPlan: null,
    trialDays: null,
    apiAvailable: true,
    platforms: ['web', 'api'],
    verificationSources: [
      'https://www.castmagic.io/',
      'https://www.castmagic.io/pricing',
      'https://www.castmagic.io/privacy',
      'https://www.castmagic.io/terms'
    ]
  },

  captions: {
    shortDescription: 'AI video editing and captioning platform for short-form clips, translated videos, AI presenters and social content.',
    sourceSummary: 'Based on published Captions and Mirage product, subscription, API and privacy information reviewed on 5 November 2026; no firsthand testing claimed.',
    long_description: `<p>Captions is an AI video creation and editing application focused on social-first video production. It combines automatic subtitles, editing tools, video translation, AI-generated presenters and generative media features into a creator-oriented workflow.</p><p>The Captions product remains available under the Captions name, while its parent company now operates as Mirage. This explains why certain developer, security and enterprise services are branded Mirage rather than Captions.</p><p>The platform can be useful for creators who need to produce captioned clips quickly, edit talking-head footage and experiment with AI-generated video. However, several advanced capabilities require higher subscriptions, and its lowest paid plan is restricted to Android.</p>`,
    how_it_works: `<p>Users record or import footage and apply available editing and caption tools. Captions can generate synchronized subtitles, support manual editing and offer features such as eye-contact correction, noise reduction and translation on eligible plans.</p><p>Higher tiers unlock AI Edit, chat-directed video changes, clip generation and digital presenters. Users can also create or customise AI Twins where available, subject to the applicable permissions and plan limits.</p><p>Video generation uses credits, and feature access varies by subscription and platform. Users should review generated captions, translated speech and synthetic video before publication, particularly where names, factual statements or personal likenesses are involved.</p>`,
    feature_groups: [
      {
        group: 'Captions and video editing',
        items: [
          'Automatic subtitles, caption styles and trimming',
          'Teleprompter, audio cleanup and social-video formatting'
        ]
      },
      {
        group: 'AI creation and localisation',
        items: [
          'AI Edit, prompt-based editing, short-video clips and dubbing',
          'AI-generated actors and AI Twins on qualifying plans'
        ]
      },
      {
        group: 'Creator and developer access',
        items: [
          'Web and mobile applications with credit-based subscriptions',
          'Separately priced Mirage API for captioning and avatar generation'
        ]
      }
    ],
    bestFor: [
      'Short-form creators producing TikTok, Reels and YouTube Shorts.',
      'Marketing teams producing frequent presenter-led videos.',
      'Businesses experimenting with multilingual videos and approved digital presenters.'
    ],
    notIdealFor: [
      'Users who need all advanced AI editing features on the free plan.',
      'iPhone or desktop users expecting the Android-only Lite subscription to unlock their devices.',
      'Editors requiring advanced long-form timeline, colour-grading or multitrack post-production controls.'
    ],
    workflows: [
      {
        title: 'Short-form video editing',
        description: 'Import a talking-head video, add synchronized captions, trim pauses and prepare an export suitable for a social platform.'
      },
      {
        title: 'Multilingual promotion',
        description: 'Create a product explanation video, translate or dub it using an eligible plan, and check the output before publishing.'
      },
      {
        title: 'AI presenter content',
        description: 'Build an approved digital presenter using eligible AI actor or AI Twin features, generate a video draft and review it for accuracy and consent.'
      }
    ],
    pros: [
      'Combines captions, editing and AI video creation in one interface.',
      'Focuses on common short-form creator workflows.',
      'Offers entry-level tools without requiring a subscription.',
      'Provides more advanced editing and presenter capabilities on higher plans.'
    ],
    cons: [
      'Feature availability differs across devices and subscriptions.',
      'The $4.99 Lite plan is Android-only.',
      'Advanced video creation can consume substantial monthly credits.',
      'Synthetic voices, faces and translations require careful review and appropriate consent.'
    ],
    pricing_overview: `<p>Captions has a free entry tier for basic editing. Official help documentation describes <strong>60–200 introductory lifetime credits</strong>, but the free plan does <strong>not</strong> provide a recurring monthly generative AI credit allowance.</p><p><strong>Lite costs $4.99/month and works only on Android.</strong> Basic costs <strong>$9.99/month</strong> and includes 200 credits per month for eligible cross-platform features. Max costs <strong>$24.99/month</strong> with 500 monthly credits, adding AI Edit, Chat to Edit, Clips and eligible AI Twin functionality.</p><p>Frontier starts at <strong>$69.99/month</strong> with 1,400 credits. Larger Frontier options offer 2,800 or 5,600 credits at higher prices.</p><p>The separately billed Mirage API has published usage pricing, including <strong>$0.15 per minute</strong> for video captioning and <strong>$0.15 per second</strong> for Avatar X generation, with minimum billing increments.</p><p>Users should verify the selected device, billing term and regional checkout price before purchasing.</p>`,
    comparison_summary: `<p>Choose <strong>Captions</strong> for an integrated, creator-oriented short-video workflow combining subtitles, social editing and optional AI presenters.</p><p>Consider <strong>OpusClip</strong> when repurposing long videos into short clips is the primary task. Consider <strong>HeyGen</strong> when avatar-led presentation and localisation matter most. Consider <strong>Descript</strong> when detailed transcript-based editing is a greater priority.</p><p>Captions is most useful when speed and convenience matter more than granular professional editing controls.</p>`,
    pricingModel: 'freemium',
    hasFreeTier: true,
    hasFreeTrial: null,
    startingPrice: 4.99,
    priceCurrency: 'USD',
    billingPeriod: 'month',
    startingPlan: 'Lite (Android only)',
    trialDays: null,
    apiAvailable: true,
    platforms: ['web', 'ios', 'android', 'api'],
    verificationSources: [
      'https://captions.ai/',
      'https://captions.ai/pricing',
      'https://captions.ai/help/docs/subscriptions',
      'https://captions.ai/help/docs/api',
      'https://captions.ai/help/docs/api/pricing',
      'https://mirage.app/legal/privacy-policy'
    ]
  },

  cartesia: {
    shortDescription: 'Developer-focused speech AI offering text-to-speech, speech recognition, voice cloning and managed voice agents.',
    sourceSummary: "Researched from Cartesia's official pricing, product and developer documentation on 5 November 2026. Promotional rates and vendor-reported technical capabilities require rechecking over time.",
    long_description: `<p>Cartesia provides speech AI models and developer infrastructure for applications that need to listen, speak or hold real-time voice conversations. Its main products include Sonic text-to-speech, Ink speech-to-text and Managed Agents for conversational applications.</p><p>The platform is aimed primarily at developers and product teams rather than people who only need an occasional voiceover. It provides APIs and SDKs for incorporating generated speech, transcription and conversational functionality into software.</p><p>Cartesia offers a free entry tier, but commercial usage and some voice-cloning capabilities require a paid subscription. Its pricing structure also separates speech-model credits from the dollar balance used for Managed Agents.</p>`,
    how_it_works: `<p>An application sends text to Cartesia's Sonic speech service or sends audio to its Ink transcription service. The output can then be used in a voice interface, transcription workflow or other application.</p><p>Developers can combine these services with their own application logic. Cartesia's Managed Agents provide an alternative managed workflow that combines speech handling, conversational orchestration, chosen language models and integrations.</p><p>Costs depend on which service is used. Speech models consume credits, while Managed Agents are charged using a separate per-minute structure. Additional telephone and language-model usage charges may apply.</p>`,
    feature_groups: [
      {
        group: 'Speech generation',
        items: [
          'Sonic text-to-speech models and streaming audio output',
          'Supported voice controls and eligible voice-cloning features'
        ]
      },
      {
        group: 'Speech recognition',
        items: [
          'Ink streaming speech-to-text',
          'Conversational turn detection for voice applications'
        ]
      },
      {
        group: 'Managed voice agents and APIs',
        items: [
          'Developer SDKs, conversational agents and tool integrations',
          'Telephony options and enterprise deployment controls'
        ]
      }
    ],
    bestFor: [
      'Developers building real-time voice-enabled applications.',
      'Product teams needing both speech recognition and generated speech.',
      'Organisations prototyping automated voice conversations with API integrations.'
    ],
    notIdealFor: [
      'Non-technical users seeking a simple finished voiceover editor.',
      'Developers planning commercial deployment using only the non-commercial Free tier.',
      'Buyers who need one flat, all-inclusive price covering every model and telephone charge.'
    ],
    workflows: [
      {
        title: 'Voice-enabled application',
        description: 'Connect Sonic text-to-speech to an application so users can hear spoken responses instead of reading text.'
      },
      {
        title: 'Conversation transcription',
        description: "Process incoming audio using Ink, capture recognised speech and pass it to an application's workflow logic."
      },
      {
        title: 'Customer service voice agent',
        description: 'Configure a Managed Agent to answer approved questions, retrieve information from connected systems and transfer unresolved matters to a person.'
      }
    ],
    pros: [
      'Provides both speech generation and speech recognition.',
      'Supports low-latency streaming use cases.',
      'Includes developer APIs and SDKs.',
      'Offers a low-cost commercial entry tier for eligible applications.'
    ],
    cons: [
      'Developer integration is required for many use cases.',
      'Free-tier usage does not include general commercial deployment rights.',
      'Model credits and agent spending use different billing systems.',
      'Voice-cloning and enterprise retention controls have plan-specific restrictions.'
    ],
    pricing_overview: `<p>Cartesia's <strong>Free plan costs $0/month</strong> and includes 20,000 monthly model credits and a $1 Managed Agents spending allowance, but the Free tier is designated for non-commercial use.</p><p><strong>Pro costs $5/month</strong> with 100,000 model credits and a $5 agent allowance, adding commercial-use rights and Instant Voice Cloning. <strong>Startup costs $49/month</strong> with 1.25 million model credits and professional voice-cloning allowances. <strong>Scale costs $299/month</strong> with 8 million model credits and higher capacity. Enterprise pricing is negotiated.</p><p>Speech-model credits and Managed Agents dollars must be considered separately. Sonic text-to-speech generally uses about one model credit per character, while Ink 2 streaming recognition uses three credits per second of audio.</p><p>As of 5 November 2026, Cartesia advertises a <strong>promotional Managed Agents rate of $0.03 per minute through 31 December 2026</strong>, reduced from $0.06 per minute. A Cartesia-provided telephone number adds a published $0.014 per minute, and language-model usage is billed separately. Buyers should check the rate applicable after the promotion ends.</p><p>Enterprise options include additional security and data-handling controls. Zero Data Retention is described for eligible speech API inference, not stored voice-cloning assets.</p>`,
    comparison_summary: `<p>Choose <strong>Cartesia</strong> when developing applications that need streaming speech generation, transcription or programmable voice interaction.</p><p>Consider <strong>ElevenLabs</strong> when evaluating a wider creative voice and audio production workflow. Consider <strong>Deepgram</strong> when speech recognition and voice API integration are key priorities. Consider <strong>Bland AI</strong> when an integrated business telephone-agent platform is more useful than modular speech APIs.</p><p>Cartesia is most relevant to teams comfortable building and maintaining voice-powered software.</p>`,
    pricingModel: 'freemium',
    hasFreeTier: true,
    hasFreeTrial: null,
    startingPrice: 5,
    priceCurrency: 'USD',
    billingPeriod: 'month',
    startingPlan: 'Pro',
    trialDays: null,
    apiAvailable: true,
    platforms: ['web', 'api'],
    verificationSources: [
      'https://www.cartesia.ai/',
      'https://www.cartesia.ai/pricing',
      'https://www.cartesia.ai/blog/managed-agents',
      'https://www.cartesia.ai/use-cases/customer-support',
      'https://docs.cartesia.ai/get-started/overview',
      'https://docs.cartesia.ai/pricing.md',
      'https://docs.cartesia.ai/enterprise/zero-data-retention.md'
    ]
  },

  'bland-ai': {
    shortDescription: 'Programmable AI phone agents for customer service, inbound calls, outbound workflows and enterprise telephony automation.',
    sourceSummary: "Based on Bland AI's official pricing and developer documentation reviewed on 5 November 2026. No claims of tested call quality or measured latency are made.",
    long_description: `<p>Bland AI is a voice-agent and telephony platform that enables organisations to build automated telephone conversations. Its tools cover incoming calls, outbound calling, conversational workflows, integrations and operational monitoring.</p><p>Unlike a general-purpose chatbot, Bland AI is designed for spoken interactions with customers and callers. Teams can configure dialogue pathways, connect external business systems and define when an automated conversation should proceed, request more information or transfer to a human.</p><p>The platform supports both a visual workflow builder and developer APIs. It is best suited to organisations with repeatable call-handling needs, clear operational rules and the resources to test automated conversations carefully.</p>`,
    how_it_works: `<p>Users configure a phone agent through conversational instructions, reusable agent settings or Bland's Conversational Pathways. A pathway can direct a conversation through different steps depending on caller answers, business conditions and information returned by connected services.</p><p>Developers can also use Bland's REST APIs and related tools to initiate calls, configure voice applications and integrate call outcomes with existing systems.</p><p>Bland combines speech recognition, language-model processing and speech generation within its voice platform. Calls still require operational oversight: automated responses can misunderstand callers, follow incomplete instructions or encounter situations that should be transferred to a trained person.</p>`,
    feature_groups: [
      {
        group: 'Inbound and outbound calling',
        items: [
          'Automated voice conversations and call initiation',
          'Phone-number integrations and supported human transfers'
        ]
      },
      {
        group: 'Conversation design and monitoring',
        items: [
          'Visual Conversational Pathways and reusable agent settings',
          'Testing tools and qualifying-plan guardrails'
        ]
      },
      {
        group: 'Developer and enterprise integrations',
        items: [
          'REST APIs, webhooks and custom workflow logic',
          'Telephony integrations and optional dedicated enterprise infrastructure'
        ]
      }
    ],
    bestFor: [
      'Contact centres handling repeatable customer enquiries.',
      'Developers building business telephone automation.',
      'Operations teams connecting voice interactions to scheduling, CRM or case-management workflows.'
    ],
    notIdealFor: [
      'Individuals looking for a general-purpose voice chatbot.',
      'Organisations expecting unlimited free calls because the entry platform fee is $0.',
      'Businesses unable to supervise sensitive customer interactions or maintain clear escalation procedures.'
    ],
    workflows: [
      {
        title: 'Customer enquiry routing',
        description: 'Answer a routine inbound question, retrieve approved information and send unresolved or sensitive requests to an appropriate employee.'
      },
      {
        title: 'Appointment coordination',
        description: 'Guide an authorised caller through appointment options, validate required information and update a connected scheduling system.'
      },
      {
        title: 'Outbound service follow-up',
        description: 'Initiate consent-compliant follow-up calls, record structured outcomes and route exceptions to a human team.'
      }
    ],
    pros: [
      'Purpose-built for automated business telephone conversations.',
      'Offers both visual conversation design and developer APIs.',
      'Uses a published connected-minute rate that bundles core speech and language-model processing.',
      'Supports advanced enterprise deployment and governance options.'
    ],
    cons: [
      'Usage charges apply even when the entry platform fee is zero.',
      'Telephone carrier, transfer and other usage charges require budgeting.',
      'Several important customer-service controls are restricted to higher plans.',
      'Real-world deployments require testing, privacy safeguards and compliance with applicable calling rules.'
    ],
    pricing_overview: `<p>Bland AI's <strong>Start plan has a $0 monthly platform fee</strong>, but this does not mean unlimited free usage. It provides a small initial credit allowance, with connected talk time charged at <strong>$0.14 per minute</strong> and applicable transfer charges of <strong>$0.05 per minute</strong>.</p><p>The <strong>Build plan costs $299/month</strong>, with connected talk time at <strong>$0.12 per minute</strong> and transfer time at <strong>$0.04 per minute</strong>. Bland's developer billing documentation also describes a <strong>Scale tier at $499/month</strong>, with rates of <strong>$0.11 per connected minute</strong> and <strong>$0.03 per transfer minute</strong>.</p><p>Separate Agent Phone and custom Enterprise arrangements are also documented. Enterprise capabilities include negotiated infrastructure and governance features.</p><p>Bland's connected-minute rates bundle the core speech-to-text, language-model and text-to-speech processing. Telephony may introduce additional charges. Customers using their own supported telephony provider can avoid Bland's transfer charge but remain responsible for their carrier costs.</p><p>Users should estimate total costs using call duration, expected transfer frequency, telephone provider and required plan features. A $0 platform fee is not the same as a permanently free service.</p>`,
    comparison_summary: `<p>Choose <strong>Bland AI</strong> when you need programmable business calling with conversation pathways, telephone integration and operational controls.</p><p>Consider <strong>Vapi</strong> or <strong>Retell AI</strong> when assessing alternative voice-agent orchestration and provider-selection approaches. Consider <strong>Cartesia</strong> when your main requirement is speech APIs and a configurable voice-agent development stack rather than Bland's business telephony workflows.</p><p>For Bland AI, the most useful comparison is the cost and reliability of a complete call-handling workflow, not just the advertised price per minute.</p>`,
    pricingModel: 'paid',
    hasFreeTier: false,
    hasFreeTrial: null,
    startingPrice: null,
    priceCurrency: null,
    billingPeriod: null,
    startingPlan: null,
    trialDays: null,
    apiAvailable: true,
    platforms: ['web', 'api'],
    verificationSources: [
      'https://www.bland.ai/',
      'https://www.bland.ai/pricing',
      'https://docs.bland.ai/welcome-to-bland',
      'https://docs.bland.ai/platform/billing.md',
      'https://docs.bland.ai/enterprise-features/infrastructure-and-releases.md'
    ]
  },

  lindy: {
    shortDescription: 'AI assistant and workflow automation platform for email, meetings, team coordination and connected business applications.',
    sourceSummary: "Researched from Lindy's official pricing, usage, documentation and security information reviewed on 5 November 2026. No firsthand testing or productivity benchmark claimed.",
    long_description: `<p>Lindy is an AI assistant platform designed to handle practical work across connected business applications. Rather than simply answering questions, it can help users organise information, prepare drafts, manage recurring tasks and coordinate work between services.</p><p>Its capabilities include inbox support, meeting assistance, scheduled routines, reusable skills, workspace memory and connected workflows. Lindy can be used as a personal productivity assistant or as a shared assistant within a team.</p><p>The platform is particularly relevant when tasks require context from several applications. However, its credit usage and per-active-user billing make it important to plan team access and automation frequency before deployment.</p>`,
    how_it_works: `<p>Users connect supported applications and describe a task or workflow. Lindy can use available information to prepare an answer, draft content, organise records or initiate an automation using its available tools.</p><p>Teams can create reusable Skills and Routines, use shared or personal memory, and interact with Lindy through supported environments such as Slack, email and meeting workflows. Higher subscription tiers support more advanced capabilities such as computer use.</p><p>Lindy provides approval controls for actions that affect external systems. Users should still review connected permissions and test workflows carefully before granting an assistant access to business information or communications.</p>`,
    feature_groups: [
      {
        group: 'AI assistants and reusable work',
        items: [
          'Skills, scheduled Routines and workspace Memory',
          'Natural-language task instructions'
        ]
      },
      {
        group: 'Communications and collaboration',
        items: [
          'Inbox triage, meeting assistance and Slack interaction',
          'Scheduling and connected application workflows'
        ]
      },
      {
        group: 'Advanced automation and controls',
        items: [
          'Computer Use on eligible plans and integrations',
          'Shared credit management and human approval mechanisms'
        ]
      }
    ],
    bestFor: [
      'Professionals managing a high volume of recurring administrative tasks.',
      'Operations teams coordinating information across multiple SaaS applications.',
      'Organisations seeking assistants for meeting follow-ups, inbox triage and team workflows.'
    ],
    notIdealFor: [
      'Users who require a permanent free subscription after the introductory trial.',
      'Teams that cannot monitor credit usage or control the number of paid seats.',
      'Organisations unwilling to grant and govern access to connected business services.'
    ],
    workflows: [
      {
        title: 'Meeting follow-up',
        description: 'Prepare meeting notes, summarise agreed actions and draft follow-up messages for approval.'
      },
      {
        title: 'Inbox triage',
        description: 'Identify messages requiring attention, organise them by priority and prepare suggested replies without sending them automatically.'
      },
      {
        title: 'Team operations',
        description: 'Monitor an approved workflow, collect information from connected tools and create a structured update for the responsible team.'
      }
    ],
    pros: [
      'Combines conversational assistance with practical workflow automation.',
      'Works with multiple supported business applications.',
      'Provides reusable Skills, Routines and shared context.',
      'Includes credit controls and approval mechanisms for external actions.'
    ],
    cons: [
      'Charges depend on active team seats and consumed credits.',
      'Monthly subscription credits do not carry over indefinitely.',
      'Advanced computer-use functionality requires an eligible higher plan.',
      'Connecting business tools introduces permission-management and data-governance responsibilities.'
    ],
    pricing_overview: `<p>Lindy offers a <strong>7-day free trial with $50 in introductory credits</strong>, without requiring a credit card. It does not provide an ongoing unrestricted free subscription.</p><p>Lindy is currently presenting different Team entry offers. Its official pricing page has shown <strong>$29.99 per active user per month</strong> with 3,000 monthly credits, and <strong>$49.99 per active user per month</strong> with 5,000 monthly credits. Which offer is available can depend on the pricing version presented to the visitor. Higher published selections include <strong>$99.99 per active user per month for 15,000 credits</strong> and <strong>$199.99 for 35,000 credits</strong>. These charges apply per active user rather than to an entire workspace at a flat price. Check the offer shown during checkout before subscribing.</p><p>Credits from active seats are pooled within the workspace. Monthly subscription credits do <strong>not</strong> roll over, while separately purchased top-up credits remain available until used. Top-ups are advertised at <strong>$10 per 1,000 credits</strong>.</p><p>A key billing consideration is that colleagues who actively use Lindy through shared Slack interactions can become billable seats after their introductory trial. Administrators should manage memberships and credit limits carefully.</p><p>Lindy states that credit-consuming work pauses when the available pool is depleted, helping avoid uncontrolled usage charges. Phone-related features may have additional credit and number costs.</p>`,
    comparison_summary: `<p>Choose <strong>Lindy</strong> when the goal is to use an AI assistant across email, meetings, Slack and connected business applications.</p><p>Consider <strong>Zapier</strong> or <strong>Make</strong> when predictable trigger-and-action workflows are more important than conversational assistance. Consider <strong>Relay.app</strong> or <strong>Gumloop</strong> when you prefer a structured automation builder for specific processes.</p><p>Lindy makes the most sense where the value of contextual assistance and saved administrative work justifies the ongoing seat and credit costs.</p>`,
    pricingModel: 'paid',
    hasFreeTier: false,
    hasFreeTrial: true,
    startingPrice: null,
    priceCurrency: 'USD',
    billingPeriod: 'month',
    startingPlan: null,
    trialDays: 7,
    apiAvailable: false,
    platforms: ['web'],
    verificationSources: [
      'https://www.lindy.ai/',
      'https://www.lindy.ai/pricing',
      'https://www.lindy.ai/security',
      'https://docs.lindy.ai/',
      'https://docs.lindy.ai/pricing.md',
      'https://docs.lindy.ai/account-billing/usage.md'
    ]
  }
};

const EVIDENCE_BY_ID = {
  E0478: {
    sourceURL: 'https://www.castmagic.io/pricing',
    fieldScope: '["targetUsers", "pricingModel", "hasFreeTier", "hasFreeTrial", "paidPlanAvailable", "platforms", "apiAvailable", "licenseType", "deploymentModes", "bestFor", "notIdealFor", "recurringFreeIntentIds", "finderIntentIds", "freeAccessType", "canonicalName", "website_url", "operationalStatus", "sourceSummary", "pricingScope", "freeTierScope", "capabilityScope", "audienceTags", "primaryCategory", "primaryUseCases", "targetUserDetails", "long_description", "shortDescription"]',
    method: 'official_source_review',
    reviewedAt: '2026-11-05',
    finding: 'Official pricing page reviewed 05 November 2026: Hobby ($29/mo or $239/yr, 30 library hours), Starter ($69/mo or $579/yr, 100 library hours), Team ($199/mo or $1,669/yr for 5 seats, 400 library hours) and Business & Scale confirmed; included transcription hours verified as non-renewing library totals rather than monthly allowances, and annual plan headline monthly equivalents ($19/$48/$139) verified as rounded down.'
  },
  E0479: {
    sourceURL: 'https://www.castmagic.io/privacy',
    fieldScope: '["targetUsers", "deploymentModes", "bestFor", "notIdealFor", "recurringFreeIntentIds", "finderIntentIds", "freeAccessType", "canonicalName", "website_url", "operationalStatus", "sourceSummary", "capabilityScope", "audienceTags", "primaryCategory", "primaryUseCases", "targetUserDetails", "long_description", "shortDescription"]',
    method: 'official_source_review',
    reviewedAt: '2026-11-05',
    finding: 'Official product homepage, privacy policy and terms reviewed 05 November 2026: post-recording content repurposing workspace (60+ languages, Magic Chat, Spaces, clips/audiograms) and API eligibility caveats between feature table and FAQ verified.'
  },
  E0472: {
    sourceURL: 'https://captions.ai/pricing',
    fieldScope: '["targetUsers", "pricingModel", "hasFreeTier", "paidPlanAvailable", "platforms", "apiAvailable", "licenseType", "deploymentModes", "bestFor", "notIdealFor", "recurringFreeIntentIds", "finderIntentIds", "freeAccessType", "canonicalName", "website_url", "operationalStatus", "sourceSummary", "pricingScope", "startingPrice", "priceCurrency", "billingPeriod", "startingPlan", "freeTierScope", "capabilityScope", "audienceTags", "primaryCategory", "primaryUseCases", "targetUserDetails", "long_description", "shortDescription"]',
    method: 'official_source_review',
    reviewedAt: '2026-11-05',
    finding: 'Official pricing page reviewed 05 November 2026: Lite ($4.99/mo Android-only), Basic ($9.99/mo, 200 monthly credits), Max ($24.99/mo, 500 monthly credits, AI Edit/Clips/AI Twin) and Frontier ($69.99/mo for 1,400 credits, plus 2,800 and 5,600 credit tiers) verified.'
  },
  E0473: {
    sourceURL: 'https://captions.ai/help/docs/subscriptions',
    fieldScope: '["pricingModel", "hasFreeTier", "startingPrice", "priceCurrency", "billingPeriod", "startingPlan", "freeTierScope", "pricingScope", "bestFor", "notIdealFor", "sourceSummary", "long_description", "shortDescription"]',
    method: 'official_source_review',
    reviewedAt: '2026-11-05',
    finding: 'Official subscription help documentation (https://captions.ai/help/docs/subscriptions) reviewed 05 November 2026: Free tier confirmed to grant 60-200 introductory lifetime credits with no recurring monthly generative AI credit allowance; Android-only restriction on $4.99/mo Lite tier and Basic ($9.99/mo, 200 monthly credits, formerly Pro) verified.'
  },
  E0474: {
    sourceURL: 'https://captions.ai/help/docs/api/pricing',
    fieldScope: '["platforms", "apiAvailable", "pricingScope", "capabilityScope", "sourceSummary", "long_description", "shortDescription"]',
    method: 'official_source_review',
    reviewedAt: '2026-11-05',
    finding: 'Official Mirage API pricing documentation (https://captions.ai/help/docs/api/pricing) reviewed 05 November 2026: separately billed usage-based developer API confirmed at $0.15/minute for Video Captions (input video duration rounded up to a full minute) and $0.15/second for Avatar X video generation (generated video duration rounded up to 6-second increments). Legacy help.mirage.app and help.captions.ai Intercom article URLs verified obsolete (HTTP 404).'
  },
  E0475: {
    sourceURL: 'https://mirage.app/legal/privacy-policy',
    fieldScope: '["canonicalName", "website_url", "operationalStatus", "sourceSummary", "capabilityScope", "long_description", "shortDescription"]',
    method: 'official_source_review',
    reviewedAt: '2026-11-05',
    finding: 'Official Mirage privacy policy (https://mirage.app/legal/privacy-policy) and product pages reviewed 05 November 2026: Captions product active under parent company Mirage (Captions LLC, d/b/a Mirage) with voice/likeness processing disclosures verified.'
  },
  E0476: {
    sourceURL: 'https://www.cartesia.ai/pricing',
    fieldScope: '["targetUsers", "pricingModel", "hasFreeTier", "paidPlanAvailable", "platforms", "apiAvailable", "licenseType", "deploymentModes", "bestFor", "notIdealFor", "recurringFreeIntentIds", "finderIntentIds", "freeAccessType", "canonicalName", "website_url", "operationalStatus", "sourceSummary", "pricingScope", "startingPrice", "priceCurrency", "billingPeriod", "startingPlan", "freeTierScope", "capabilityScope", "audienceTags", "primaryCategory", "primaryUseCases", "targetUserDetails", "long_description", "shortDescription"]',
    method: 'official_source_review',
    reviewedAt: '2026-11-05',
    finding: 'Official pricing page reviewed 05 November 2026: Free ($0/mo, 20k model credits + $1 Managed Agents allowance, non-commercial use only), Pro ($5/mo, 100k model credits + $5 agent allowance, commercial rights and Instant Voice Cloning), Startup ($49/mo, 1.25M credits), Scale ($299/mo, 8M credits) and Enterprise verified.'
  },
  E0477: {
    sourceURL: 'https://docs.cartesia.ai/pricing.md',
    fieldScope: '["targetUsers", "platforms", "apiAvailable", "deploymentModes", "bestFor", "notIdealFor", "sourceSummary", "pricingScope", "capabilityScope", "primaryUseCases", "long_description", "shortDescription"]',
    method: 'official_source_review',
    reviewedAt: '2026-11-05',
    finding: 'Official developer pricing and Zero Data Retention documentation reviewed 05 November 2026: Sonic TTS (~1 credit/char), Ink-2 streaming STT (3 credits/sec), time-limited Managed Agents promotional rate of $0.03/min through 31 December 2026 (reduced from $0.06/min; plus $0.014/min telephony and separate LLM usage) and Enterprise ZDR scope (eligible speech API inference, excluding stored voice clones) verified.'
  },
  E0863: {
    sourceURL: 'https://www.bland.ai/pricing',
    fieldScope: '["targetUsers", "pricingModel", "hasFreeTier", "paidPlanAvailable", "platforms", "apiAvailable", "deploymentModes", "bestFor", "notIdealFor", "canonicalName", "website_url", "operationalStatus", "sourceSummary", "pricingScope", "capabilityScope", "primaryCategory", "primaryUseCases", "long_description", "shortDescription"]',
    method: 'official_source_review',
    reviewedAt: '2026-11-05',
    finding: 'Official pricing page and developer billing/infrastructure docs (docs.bland.ai/platform/billing.md) reviewed 05 November 2026: Start ($0/mo platform fee, $0.14/min connected talk time, $0.05/min transfer), Build ($299/mo, $0.12/min connected, $0.04/min transfer), Scale ($499/mo, $0.11/min connected, $0.03/min transfer), REST API availability (apiAvailable=true, platforms=["web","api"]) and BYO telephony carrier cost rules verified.'
  },
  E0869: {
    sourceURL: 'https://www.lindy.ai/pricing',
    fieldScope: '["targetUsers", "pricingModel", "hasFreeTier", "hasFreeTrial", "paidPlanAvailable", "startingPrice", "priceCurrency", "billingPeriod", "startingPlan", "trialDays", "platforms", "apiAvailable", "deploymentModes", "bestFor", "notIdealFor", "canonicalName", "website_url", "operationalStatus", "sourceSummary", "pricingScope", "capabilityScope", "primaryCategory", "primaryUseCases", "long_description", "shortDescription"]',
    method: 'official_source_review',
    reviewedAt: '2026-11-05',
    finding: 'Official pricing page and billing docs reviewed 05 November 2026: 7-day free trial with $50 introductory credits verified; active server-side pricing experiment (experimentKey: plus-49-packaging) confirmed presenting two different entry offers on https://www.lindy.ai/pricing ($29.99/active user/month for 3,000 monthly credits on control arm vs $49.99/active user/month for 5,000 monthly credits on v2 arm), with higher selections at $99.99/active user/month (15,000 credits) and $199.99/active user/month (35,000 credits), pooled workspace credits, non-rollover monthly credits, $10/1,000 top-up credits and chargeable Slack active seats after 7-day trial. Structured startingPrice and startingPlan set to null while dual public entry offers remain active.'
  }
};

export function main() {
  const targetIds = Object.keys(ENRICHMENTS);
  console.log(`[ENRICH] Processing ${targetIds.length} target profiles: ${targetIds.join(', ')}...`);

  // 1. Update data/tools.json with whitelist fields and structured fields
  const tools = JSON.parse(fs.readFileSync(TOOLS_JSON_PATH, 'utf8'));

  for (const tool of tools) {
    if (ENRICHMENTS[tool.id]) {
      const data = ENRICHMENTS[tool.id];
      tool.shortDescription = data.shortDescription;
      tool.sourceSummary = data.sourceSummary;
      tool.description = data.sourceSummary || data.shortDescription;
      tool.long_description = data.long_description;
      tool.bestFor = data.bestFor;
      tool.best_for = data.bestFor;
      tool.notIdealFor = data.notIdealFor;
      tool.workflows = data.workflows;
      tool.how_it_works = data.how_it_works;
      tool.feature_groups = data.feature_groups;
      tool.pros = data.pros;
      tool.cons = data.cons;
      tool.pricing_overview = data.pricing_overview;
      tool.comparison_summary = data.comparison_summary;
      tool.pricingModel = data.pricingModel;
      tool.pricing_model = data.pricingModel;
      tool.hasFreeTier = data.hasFreeTier;
      tool.has_free_tier = data.hasFreeTier;
      tool.hasFreeTrial = data.hasFreeTrial;
      tool.startingPrice = data.startingPrice;
      tool.priceCurrency = data.priceCurrency;
      tool.billingPeriod = data.billingPeriod;
      tool.startingPlan = data.startingPlan;
      tool.trialDays = data.trialDays;
      tool.apiAvailable = data.apiAvailable;
      tool.platforms = data.platforms;
      tool.verificationSources = data.verificationSources;
      tool.reviewedAt = '2026-11-05';
      tool.editorialStatus = 'source_based_summary';
    }
  }

  fs.writeFileSync(TOOLS_JSON_PATH, JSON.stringify(tools, null, 2), 'utf8');

  // 2. Update Excel Workbook
  if (fs.existsSync(WORKBOOK_PATH)) {
    console.log(`[EXCEL] Reading workbook ${WORKBOOK_PATH}...`);
    const wb = XLSX.readFile(WORKBOOK_PATH);
    const catalogSheet = wb.Sheets['Catalog'];
    if (!catalogSheet) {
      console.error('[ERROR] Missing Catalog sheet in workbook');
      process.exit(1);
    }
    const rows = XLSX.utils.sheet_to_json(catalogSheet, { defval: null });
    let updatedRows = 0;
    rows.forEach(row => {
      const data = ENRICHMENTS[row.id];
      if (data) {
        row.bestFor = JSON.stringify(data.bestFor);
        row.notIdealFor = JSON.stringify(data.notIdealFor);
        row.platforms = JSON.stringify(data.platforms);
        row.apiAvailable = data.apiAvailable === true ? 'TRUE' : (data.apiAvailable === false ? 'FALSE' : null);
        row.long_description = data.long_description;
        row.sourceSummary = data.sourceSummary;
        row.shortDescription = data.shortDescription;
        row.editorialStatus = 'source_based_summary';
        row.pricingModel = data.pricingModel;
        row.hasFreeTier = data.hasFreeTier === true ? 'TRUE' : (data.hasFreeTier === false ? 'FALSE' : null);
        row.hasFreeTrial = data.hasFreeTrial === true ? 'TRUE' : (data.hasFreeTrial === false ? 'FALSE' : null);
        row.startingPrice = data.startingPrice;
        row.priceCurrency = data.priceCurrency;
        row.billingPeriod = data.billingPeriod;
        row.startingPlan = data.startingPlan;
        row.trialDays = data.trialDays;
        row.verificationSources = JSON.stringify(data.verificationSources);
        row.reviewedAt = '2026-11-05';
        updatedRows++;
        console.log(`  ✓ Synced Excel row for ${row.id}`);
      }
    });
    if (updatedRows !== 5) {
      console.error(`[ERROR] Expected to update 5 Excel rows, updated ${updatedRows}`);
      process.exit(1);
    }
    const newSheet = XLSX.utils.json_to_sheet(rows);
    wb.Sheets['Catalog'] = newSheet;
    XLSX.writeFile(wb, WORKBOOK_PATH);
    console.log(`[SUCCESS] Excel workbook synchronized successfully (${updatedRows} rows).\n`);
  } else {
    console.warn(`[WARN] Excel workbook not found at ${WORKBOOK_PATH}`);
  }

  // 3. Run official import-phase11-workbook to regenerate staged catalogue deterministically
  console.log('[IMPORT] Running scripts/import-phase11-workbook.mjs to generate staged catalogue...');
  execSync('node scripts/import-phase11-workbook.mjs', { cwd: WORKTREE_ROOT, stdio: 'inherit' });

  // 4. Copy staged to tools.json to maintain 100% byte-for-byte parity
  fs.copyFileSync(STAGED_JSON_PATH, TOOLS_JSON_PATH);
  console.log('[PARITY] Copied tools.phase11.staged.json to tools.json (100% byte-for-byte parity).\n');

  // 5. Update Evidence Ledger BEFORE generating comparison-index so evidenceReviewedAt is current on first pass
  if (fs.existsSync(LEDGER_PATH)) {
    console.log(`[LEDGER] Reading evidence ledger ${LEDGER_PATH}...`);
    const ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
    const isArray = Array.isArray(ledger);
    const items = isArray ? ledger : Object.values(ledger);

    let updatedLedgerCount = 0;

    items.forEach(item => {
      if (item && EVIDENCE_BY_ID[item.evidenceId]) {
        const spec = EVIDENCE_BY_ID[item.evidenceId];
        item.sourceURL = spec.sourceURL;
        item.fieldScope = spec.fieldScope;
        item.method = spec.method;
        item.reviewedAt = spec.reviewedAt;
        item.finding = spec.finding;
        updatedLedgerCount++;
        console.log(`  ✓ Updated evidence ledger record for ${item.id} (${item.evidenceId})`);
      }
    });

    fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2), 'utf8');
    console.log(`[SUCCESS] Evidence ledger updated (${updatedLedgerCount} entries refreshed).\n`);
  }

  // 6. Regenerate comparison index
  console.log('[INDEX] Regenerating data/comparison-index.json...');
  execSync('node scripts/generate-comparison-index.mjs', { cwd: WORKTREE_ROOT, stdio: 'inherit' });
}

// Direct execution
if (process.argv[1] && process.argv[1].endsWith('enrich-priority-batch4b.mjs')) {
  main();
}
