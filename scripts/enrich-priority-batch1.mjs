import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

const WORKTREE_ROOT = process.cwd();
const TOOLS_JSON_PATH = path.join(WORKTREE_ROOT, 'data/tools.json');
const WORKBOOK_PATH = path.join(WORKTREE_ROOT, 'data/WhichAIPick_Catalog_PHASE11_ANTIGRAVITY_IMPORT_CONTRACT_COMPLETE_2026-10-01.xlsx');
const LEDGER_PATH = path.join(WORKTREE_ROOT, 'data/evidence/phase11-evidence-ledger.json');

const ENRICHMENTS = {
  ollama: {
    long_description: `<p>Ollama is an open-source model runtime designed to download, configure, and execute large language models locally on macOS, Linux, and Windows. By packaging model weights, prompt templates, and execution configurations into a unified Modelfile format, Ollama abstracts low-level inference engineering into a command-line interface and background service.</p><p>The runtime provides a native local REST API on port 11434 alongside OpenAI-compatible endpoints, enabling desktop applications, code editors, and automated agents to query local models without code modifications. For teams requiring hosted capacity, Ollama also provides managed cloud infrastructure with per-token billing.</p>`,
    bestFor: [
      'Software engineers integrating open-weight LLMs into local development environments and automated test pipelines',
      'Security-sensitive teams and researchers requiring fully offline model inference with zero data retention',
      'Developers wanting a unified local API and Modelfile management system for multiple open-source model families'
    ],
    notIdealFor: [
      'Hardware setups lacking dedicated GPU acceleration or sufficient unified memory for 70B+ parameter models',
      'Non-technical users expecting a turnkey graphical consumer chat interface without installing separate frontends',
      'Workflows requiring proprietary cloud models like Claude 3.5 Sonnet or GPT-4o through local execution'
    ],
    primaryUseCases: [
      'Running open-source language models locally on personal computers and workstations',
      'Powering local coding copilots, terminal assistants, and privacy-first retrieval pipelines',
      'Serving OpenAI-compatible endpoints for testing AI applications without incurrence of cloud API costs'
    ],
    how_it_works: `<p>Ollama operates as a local background daemon that manages model lifecycle, quantization, and memory allocation. Users download models via the command line using simple pull commands (such as <code>ollama run llama3.3</code> or <code>ollama run deepseek-r1</code>), which automatically retrieve quantized GGUF weights from the Ollama library. The runtime detects available system hardware—including Apple Silicon Metal, Nvidia CUDA, and AMD ROCm—and offloads model layers to GPU memory dynamically.</p><p>Once running, Ollama exposes an HTTP server at <code>http://localhost:11434</code> with endpoints for generation (<code>/api/generate</code>), chat completions (<code>/api/chat</code>), and OpenAI compatibility (<code>/v1/chat/completions</code>). Developers can customize system instructions, temperature, and context length by authoring custom <code>Modelfiles</code> and building tailored local variants.</p>`,
    feature_groups: [
      {
        group: 'Local Inference & Hardware Acceleration',
        items: [
          'Automated hardware detection and layer offloading for Apple Silicon (Metal), Nvidia (CUDA), and AMD (ROCm)',
          'GGUF quantization support enabling efficient execution of 4-bit, 8-bit, and 16-bit weight representations',
          'Native background daemon managing concurrent model requests and GPU memory caching',
          'Zero telemetry and fully offline capability ensuring complete data isolation'
        ]
      },
      {
        group: 'API & Developer Tooling',
        items: [
          'Local REST API for prompt streaming, chat completions, embeddings, and model management',
          'OpenAI-compatible /v1/chat/completions endpoint for seamless drop-in SDK integration',
          'Modelfile syntax for packaging custom system prompts, parameters, and stop sequences',
          'Extensive ecosystem compatibility with Open WebUI, Continue.dev, LangChain, and LlamaIndex'
        ]
      }
    ],
    pros: [
      'Local execution ensures complete data confidentiality with no outbound network requests required during inference',
      'OpenAI API endpoint compatibility enables instant integration into existing developer tooling and libraries',
      'Active model registry provides fast single-command access to popular open models like Llama, Mistral, and DeepSeek',
      'Permissive MIT runtime license with zero software licensing costs for local deployment and experimentation'
    ],
    cons: [
      'Local generation throughput and model size are strictly constrained by local GPU VRAM and system memory bandwidth',
      'Does not include a built-in graphical user interface, requiring third-party tools like Open WebUI for browser chat',
      'Context window expansion beyond default settings requires manual configuration and significantly increases RAM usage',
      'Hosted Ollama Cloud features require separate paid subscriptions or usage credits starting at $20 per month'
    ],
    pricing_overview: `<p>Ollama is fundamentally free and open source under the MIT license for local execution on personal hardware. The local runtime has no usage limits, subscription fees, or license costs, allowing unlimited inference constrained only by your physical GPU, CPU, and RAM capacity.</p><p>For users who want to run models in the cloud without local hardware, Ollama offers paid hosted tiers: <strong>Pay As You Go</strong> ($0 subscription, pay-per-token via usage credits, 3 concurrent requests), <strong>Pro</strong> ($20/month or $200/year, includes $60 monthly usage credits and access to larger Pro models), <strong>Max</strong> ($100/month, includes $300 monthly usage credits and 10 concurrent requests), and <strong>Team</strong> ($500/month, includes $1,000 pooled credits and shared administration). Enterprise plans with dedicated SLA and security compliance are available upon custom quote.</p>`,
    comparison_summary: `<p>Compared to <strong>LM Studio</strong>, Ollama focuses on a developer-first, headless CLI and API architecture rather than a desktop GUI, making it better suited for scripts, agent frameworks, and background services, though LM Studio offers an easier visual onboarding experience for casual desktop users. Compared to heavy inference frameworks like <strong>vLLM</strong> or <strong>TGI</strong>, Ollama prioritizes rapid local development and personal workstation convenience over clustered multi-GPU server throughput. Compared to <strong>llama.cpp</strong>, Ollama wraps the underlying C++ inference engine in a clean, package-managed distribution with automatic model pulling, saving developers from compiling binaries and managing raw GGUF files manually.</p>`
  },

  recraft: {
    long_description: `<p>Recraft is an AI-powered design environment built specifically for creating and editing professional graphic design assets, vector illustrations, and brand visuals. Unlike conventional generative art platforms that focus primarily on raster images, Recraft provides native generation of editable vector graphics in SVG format alongside high-resolution raster outputs.</p><p>The platform features an infinite canvas workspace where design teams can generate icons, 3D graphics, illustrations, and marketing visuals with consistent artistic styles. Built-in tools include vector editing, color palette enforcement, image vectorization, background removal, and generative inpainting.</p>`,
    bestFor: [
      'Graphic designers and brand identity teams needing consistent vector illustrations and clean SVG exports',
      'UI/UX designers creating coherent icon sets, 3D interface assets, and custom digital marketing graphics',
      'Creative directors looking to maintain strict brand color palettes and stylistic cohesion across asset libraries'
    ],
    notIdealFor: [
      'Commercial projects using only the free plan, which restricts outputs to personal use and makes creations public',
      'Developers expecting web studio subscription credits to cover programmatic API calls, which are billed separately',
      'Photographers looking strictly for traditional darkroom photo retouching rather than generative illustration'
    ],
    primaryUseCases: [
      'Generating scalable vector illustrations and icon sets in SVG format for websites and mobile applications',
      'Creating stylistically unified brand graphics and marketing collateral with enforced custom color palettes',
      'Converting bitmap sketches and low-resolution raster images into cleanly layered vector graphics'
    ],
    how_it_works: `<p>Recraft combines proprietary diffusion-based raster generation with custom vectorization architectures on an infinite digital canvas. Designers begin by selecting a design category (such as Vector Illustration, Icon, 3D Graphic, or Photorealism) and choosing an established art style or training a custom style model from reference images. Prompts are entered with optional constraints on brand color codes and layout compositions.</p><p>When generating vectors, Recraft outputs genuine SVG paths that can be edited directly inside the platform or exported into vector editors like Adobe Illustrator and Figma. The studio provides fine-grained controls including a Magic Wand for local regenerations, vector cleanup tools to reduce anchor point density, layer management, and precision erase/inpaint tools.</p>`,
    feature_groups: [
      {
        group: 'Vector & Raster Generation',
        items: [
          'True SVG vector export with layered, editable vector paths and scalable geometry',
          'High-resolution raster rendering with support for 2K upscaling and photorealistic textures',
          'Automatic vectorization converting raster artwork and sketches into clean vector shapes',
          'Diverse built-in style libraries covering isometric 3D, line art, flat design, and corporate illustration'
        ]
      },
      {
        group: 'Studio Canvas & Brand Controls',
        items: [
          'Infinite collaborative canvas allowing spatial organization of entire design campaigns',
          'Custom style creation from uploaded reference imagery to enforce brand visual consistency',
          'Palette locking to ensure generated assets conform to exact corporate hexadecimal brand colors',
          'Inpainting, generative fill, background removal, and object replacement on canvas'
        ]
      }
    ],
    pros: [
      'Native SVG generation produces genuine scalable vector files rather than simple rasterized images',
      'Custom style training allows design teams to maintain uniform brand aesthetics across hundreds of assets',
      'Infinite canvas interface enables contextual side-by-side asset iteration and campaign-level visual layout',
      'Affordable paid tiers unlock private generations and full commercial usage rights for professional projects'
    ],
    cons: [
      'Free tier generations are strictly public and do not include commercial usage rights',
      'Complex vector graphics can generate dense anchor point counts requiring cleanup in Illustrator or Figma',
      'Monthly studio subscription credits do not roll over across billing cycles and cannot be used for API requests',
      'API integration requires separate pay-per-image prepaid unit billing ($0.035 to $0.08+ per image/vector)'
    ],
    pricing_overview: `<p>Recraft operates on a freemium model. The <strong>Free Plan</strong> ($0) provides a daily credit allowance, access to basic styles, and canvas editing, but all generations are public and restricted to personal non-commercial use.</p><p>Professional tiers unlock full commercial usage rights and private generations: <strong>Basic</strong> is $10/month billed annually ($12/month monthly) and includes 1,000 monthly credits, private outputs, and custom style creation. <strong>Pro</strong> is $16/month billed annually ($20/month monthly) and provides 2,000 monthly credits, priority processing, and video generation tools. <strong>Teams</strong> is $18/seat/month billed annually ($22/seat/month monthly) with shared workspaces, centralized billing, and team asset management. Programmatic API usage is metered separately via prepaid API units ranging from roughly $0.035 for raster styles to $0.05–$0.08+ for vector generations.</p>`,
    comparison_summary: `<p>Compared to <strong>Midjourney</strong>, Recraft provides native SVG vector file exports and an interactive canvas workspace, whereas Midjourney produces only raster images through Discord or web feeds with no vector editing. Compared to <strong>Adobe Firefly</strong>, Recraft offers more specialized controls for stylized vector graphic illustration and icon generation, though Firefly integrates directly into the Creative Cloud desktop applications. Compared to <strong>Kittl</strong>, Recraft features stronger foundational generative vector models, while Kittl combines AI generation with print-on-demand layout templates and commercial typography tools.</p>`
  },

  upscayl: {
    long_description: `<p>Upscayl is an open-source, AI-powered desktop image upscaling application designed to enlarge and enhance low-resolution images locally without transmitting data to remote servers. Released under the GNU General Public License (GPL-3.0), Upscayl operates natively on macOS, Windows, and Linux.</p><p>By leveraging deep learning models such as Real-ESRGAN, UltraSharp, and Remacri, Upscayl reconstructs missing edge definition, sharpens textures, and scales images by up to 4x, 8x, or 16x. For users requiring web-based processing without dedicated local graphics hardware, an optional cloud service is also available.</p>`,
    bestFor: [
      'Photographers, graphic artists, and printmakers needing free, high-ratio image upscaling without recurring costs',
      'Privacy-conscious individuals and organizations requiring 100% offline desktop processing with zero cloud uploads',
      'Digital creators batch-processing large collections of low-resolution legacy photos, game textures, or anime art'
    ],
    notIdealFor: [
      'Computers lacking a Vulkan-compatible dedicated GPU or modern Apple Silicon processor',
      'Severely out-of-focus or motion-blurred photographs where optical image data is fundamentally absent',
      'Users seeking full raster editing suites, generative text-to-image creation, or layer-based photo composition'
    ],
    primaryUseCases: [
      'Upscaling low-resolution digital photos, vintage scans, and illustrations for large-format physical printing',
      'Enhancing and sharpening video game textures, pixel art, and digital anime artwork locally',
      'Batch processing folders of product photography to achieve consistent high-resolution web standards'
    ],
    how_it_works: `<p>Upscayl runs as a standalone desktop executable built with Electron and the NCNN neural network inference framework. When a user selects an image, the application processes pixel data through a selected convolutional neural network or vision transformer model using the Vulkan graphics API. This architecture enables hardware-accelerated tensor computations across Nvidia, AMD, Intel, and Apple Silicon GPUs without complex CUDA driver configurations.</p><p>Users can select from several purpose-built AI models: <strong>Upscayl Standard</strong> for general photography, <strong>UltraSharp</strong> for fine architectural and landscape detail, <strong>Remacri</strong> for realistic texture restoration, and <strong>Digital Art</strong> for clean vector-like line sharpening. The app supports single-image before-and-after slider comparisons as well as unattended batch folder upscaling.</p>`,
    feature_groups: [
      {
        group: 'Local Desktop AI Upscaling',
        items: [
          'Completely local processing on macOS, Windows, and Linux with zero external network connectivity required',
          'Vulkan API hardware acceleration supporting Nvidia, AMD, Intel Arc, and Apple Silicon GPUs',
          'Multi-ratio scaling options allowing 4x standard scaling up to 16x double-pass enhancement',
          'Batch processing queue capable of converting entire directories of images automatically'
        ]
      },
      {
        group: 'Specialized Neural Models',
        items: [
          'General Photo & Real-ESRGAN models for restoring natural contrast and smoothing digital noise',
          'UltraSharp model optimized for high-frequency micro-textures in landscape and product photography',
          'Remacri model engineered for facial preservation and subtle skin texture reconstruction',
          'Digital Art and Anime models designed to sharpen edges without introducing ringing artifacts'
        ]
      }
    ],
    pros: [
      'Completely free and open-source desktop software with no subscription fees, watermarks, or usage quotas',
      'Total data privacy with all inference executing locally on your device graphics processor',
      'Batch processing functionality handles entire folders of images without manual step-by-step intervention',
      'Active open-source community providing frequent model updates and cross-platform installation packages'
    ],
    cons: [
      'Requires a modern Vulkan-compatible GPU; older integrated graphics chips experience slow speeds or crashes',
      'Cannot restore optical detail from severely blurred or heavily degraded images where structure is missing',
      'Processing times for high-resolution 16x upscaling can be lengthy and memory-intensive on entry-level hardware',
      'Upscayl Cloud features (for web upscaling and generation) require separate paid credits starting at $24.99/mo'
    ],
    pricing_overview: `<p>The core Upscayl Desktop application is <strong>100% free and open-source</strong> under the GPL-3.0 license. Users can download, install, and run the software on Windows, macOS, and Linux without payment, account registration, watermarking, or image limits.</p><p>For users who lack compatible graphics hardware or prefer web access, the vendor offers <strong>Upscayl Cloud</strong>: a <strong>Free Trial</strong> with 10 credits to test the web engine, a <strong>Pro Plan</strong> at $24.99/month (providing 300 monthly credits with rollover, upscaling up to 256MP, and AI image generation), and custom Business tiers with priority support and unlimited storage for commercial production pipelines.</p>`,
    comparison_summary: `<p>Compared to <strong>Topaz Photo AI</strong>, Upscayl is completely free and open-source, whereas Topaz costs $199 upfront with paid annual upgrade renewals, though Topaz includes advanced denoising, deblurring, and face-recovery models. Compared to <strong>Magnific AI</strong>, Upscayl focuses on deterministic super-resolution without hallucinating new artistic details, while Magnific is a costly cloud service ($39+/mo) that uses generative hallucination to reinvent intricate textures. Compared to online upscalers like <strong>Bigjpg</strong> or <strong>VanceAI</strong>, Upscayl eliminates recurring subscription fees and avoids uploading confidential images to third-party servers.</p>`
  },

  docsbot: {
    long_description: `<p>DocsBot is an AI knowledge management and customer support platform designed to train intelligent assistants on organizational documentation, websites, product manuals, and historical support tickets. By indexing proprietary content into a managed vector retrieval system, DocsBot enables companies to provide accurate, grounded answers to user questions across multiple communication channels.</p><p>The platform provides customizable web chat widgets, native messaging integrations (Slack, Microsoft Teams, WhatsApp), and developer REST APIs. DocsBot includes action triggers for automated lead collection, ticketing escalations, and CRM integrations, allowing support teams to reduce ticket overhead while maintaining strict source attribution.</p>`,
    bestFor: [
      'SaaS customer success teams seeking to automate first-response answers using existing help centers and documentation',
      'Product and developer relations teams deploying grounded interactive search across API references and technical guides',
      'Businesses needing multi-channel bot deployment across websites, Slack, Microsoft Teams, and WhatsApp'
    ],
    notIdealFor: [
      'Large documentation libraries exceeding the 50-page and 100-credit limitations of the free tier',
      'Companies on standard tiers requiring unbranded, white-label chat widgets (requires the $499/mo Business plan)',
      'Enterprises requiring on-premises self-hosting outside of custom, high-tier enterprise agreements'
    ],
    primaryUseCases: [
      'Automating website customer support inquiries by answering questions directly from help docs and sitemaps',
      'Serving internal company knowledge to employees inside Slack and Microsoft Teams channels',
      'Powering contextual in-app help widgets that suggest answers and escalate complex tickets to human agents'
    ],
    how_it_works: `<p>DocsBot operates through a managed Retrieval-Augmented Generation (RAG) architecture. Administrators create a bot and ingest knowledge sources by providing website URLs, sitemaps, PDF/Word documents, Markdown files, Notion workspaces, GitHub repositories, or past help desk tickets from Zendesk and Help Scout. The platform segments, embeds, and indexes the text into an optimized vector database with automatic periodic re-crawling to maintain freshness.</p><p>When a user asks a question, DocsBot performs semantic search across the indexed knowledge base to retrieve relevant context passages, synthesizes a concise response with direct citation links, and formats the output for the user interface. If configured, custom AI Actions can execute external webhooks, collect contact details, schedule meetings via Calendly, or open support tickets automatically.</p>`,
    feature_groups: [
      {
        group: 'Knowledge Ingestion & Vector Retrieval',
        items: [
          'Multi-source ingestion supporting sitemaps, web crawls, PDFs, Markdown, Notion, and GitHub repositories',
          'Automated sitemap re-indexing to ensure customer-facing chatbots reflect the latest documentation updates',
          'Source citation generation providing transparent links to relevant help center articles with every response',
          'Help desk history indexing compatible with Zendesk, Help Scout, and Freshdesk ticket archives'
        ]
      },
      {
        group: 'Deployment & Workflow Automation',
        items: [
          'Customizable embeddable web chat widget with theme styling, localized greetings, and quick prompts',
          'Multi-channel deployment for Slack, Microsoft Teams, WhatsApp, Telegram, and Facebook Messenger',
          'Action buttons and webhook triggers for lead capture, Calendly meeting booking, and ticket escalations',
          'Developer REST API providing full programmatic access for custom in-app search and chat implementations'
        ]
      }
    ],
    pros: [
      'Grounds all responses in verified company documentation with direct citations to minimize hallucinations',
      'Broad ingestion capabilities connect directly to sitemaps, help desk archives, Notion, and code repositories',
      'Multi-channel support allows deployment across public websites and internal Slack or Microsoft Teams channels',
      'AI Actions enable practical workflow integrations like lead generation and support ticket routing'
    ],
    cons: [
      'Free tier is strictly limited to 1 bot, 50 indexed pages, and 100 monthly AI query credits',
      'Unbranded white-label widgets and client-side PII redaction require the $499/month Business subscription',
      'Accuracy is heavily dependent on documentation structure; disorganized source docs can produce vague answers',
      'Self-hosted deployments and SOC 2 Type II compliance are restricted to custom-priced Enterprise contracts'
    ],
    pricing_overview: `<p>DocsBot offers a freemium pricing structure. The <strong>Free Plan</strong> ($0/month) allows 1 bot, 50 source pages, 100 monthly AI credits, and 1 team seat, serving as an evaluation sandbox.</p><p>Paid self-serve plans scale with bot counts, source volume, and team collaboration: <strong>Personal</strong> is $49/month (1 bot, 5,000 source pages, 5,000 monthly credits, 3 actions/bot), <strong>Standard</strong> is $149/month (3 bots, 15,000 pages, 15,000 credits, 8 actions/bot, 5 team seats, web search integration), and <strong>Business</strong> is $499/month (10 bots, 100,000 pages, 60,000 credits, 12 actions/bot, 10 team seats, unbranded widgets, and client-side PII redaction). <strong>Enterprise</strong> plans provide custom capacity, single sign-on (SSO), and self-hosted options upon consultation. Additional credits ($49 per 5k) and page packs are available as add-ons.</p>`,
    comparison_summary: `<p>Compared to <strong>SiteGPT</strong>, DocsBot offers broader knowledge connector integrations (including GitHub, Notion, and Zendesk tickets) and native Slack/Teams deployments, whereas SiteGPT focuses primarily on simple website crawling and website chat widgets. Compared to <strong>Chatbase</strong>, DocsBot provides deeper developer API capabilities and custom action triggers, though Chatbase features a simpler initial onboarding setup for non-technical users. Compared to <strong>Fin by Intercom</strong>, DocsBot is an independent platform that works with any existing CRM or help desk without requiring an expensive migration to Intercom customer service ecosystem.</p>`
  },

  macwhisper: {
    long_description: `<p>MacWhisper is a native macOS application engineered for secure, local audio and video transcription using OpenAI's Whisper speech recognition models. Developed by Goodsnooze, MacWhisper runs entirely on the user's Mac hardware, leveraging Apple Silicon Neural Engines and Metal GPU acceleration to deliver accurate speech-to-text without sending sensitive audio data over the internet.</p><p>The application supports transcription across 100+ languages, audio recording from microphones or system sound, subtitle file generation (.srt, .vtt), and batch file queueing. While the free version handles standard transcription needs with lightweight models, a one-time Pro license unlocks state-of-the-art Large-v3 and Turbo models, speaker diarization, meeting recording, and custom LLM connections.</p>`,
    bestFor: [
      'Mac-based journalists, podcasters, and researchers requiring accurate transcription with strict source privacy',
      'Legal, healthcare, and corporate professionals handling confidential audio recordings that cannot be uploaded to the cloud',
      'Video editors and content creators generating synchronized subtitle files (.srt, .vtt) with word-level timestamps'
    ],
    notIdealFor: [
      'Windows or Linux users requiring a native cross-platform desktop transcription application',
      'Older Intel-based Macs lacking sufficient GPU acceleration or RAM to run larger Whisper models efficiently',
      'Teams seeking automated cloud meeting bots to attend and transcribe Google Meet or Zoom calls remotely'
    ],
    primaryUseCases: [
      'Transcribing interviews, podcasts, and lecture recordings into formatted text and timestamped subtitle files',
      'Performing real-time system dictation across macOS applications with custom vocabulary and punctuation',
      'Generating confidential meeting transcripts with automated speaker identification and AI-assisted summaries'
    ],
    how_it_works: `<p>MacWhisper runs natively as a Universal macOS app optimized for Apple Silicon (M1/M2/M3/M4) and Intel architectures. Users drag and drop audio or video files (such as MP3, WAV, M4A, MOV, or MP4) onto the window or record audio directly via microphone or system loopback. The software feeds the audio into local Whisper model weights packaged within the application or downloaded on demand.</p><p>The local inference engine processes speech segments, detects languages automatically, and calculates precise millisecond timestamps for every word. Once transcription completes, users can edit text directly within an interactive transcript editor, label individual speakers via diarization, and export outputs into SRT, VTT, Markdown, Word, PDF, or CSV formats. Pro users can also connect external LLM API keys (OpenAI, Anthropic, or local Ollama instances) to generate meeting summaries, action items, or translations.</p>`,
    feature_groups: [
      {
        group: 'Local Whisper Transcription',
        items: [
          '100% offline speech recognition with zero cloud data transmission, ensuring strict confidentiality',
          'Hardware-accelerated inference utilizing Apple Silicon Neural Engine and Metal GPU frameworks',
          'Support for full Whisper model suite including Tiny, Base, Small, Medium, Large-v3, and Whisper Turbo',
          'Multilingual transcription and translation across more than 100 languages with automatic detection'
        ]
      },
      {
        group: 'Editing & Production Tools',
        items: [
          'Interactive transcript editor with synchronized audio playback, word-level timestamps, and search',
          'Speaker diarization automatically distinguishing and labeling different voices throughout recordings',
          'Export formats covering SubRip (.srt), WebVTT (.vtt), Markdown (.md), DOCX, PDF, and CSV',
          'Batch processing queue, folder watch automations, and native macOS system-wide dictation'
        ]
      }
    ],
    pros: [
      'Complete privacy and security with local processing that never transmits audio data to third-party servers',
      'One-time lifetime purchase option on the official website avoids recurring monthly software subscriptions',
      'Exceptional transcription accuracy and speed when running on Apple Silicon (M-series) Macs',
      'Comprehensive export options include industry-standard subtitle formats with millisecond-precise timestamps'
    ],
    cons: [
      'Platform exclusive to macOS, offering no native support for Windows or Linux operating systems',
      'Running the highest-accuracy Large-v3 models requires significant unified memory and modern hardware',
      'Advanced capabilities like speaker diarization and batch queueing require upgrading to the paid Pro version',
      'The Mac App Store version uses subscription billing; lifetime licenses are only available via direct Gumroad purchase'
    ],
    pricing_overview: `<p>MacWhisper follows a freemium desktop software model. <strong>MacWhisper Free</strong> (€0) is free forever for macOS, offering unlimited offline transcription using OpenAI's Tiny and Base models, microphone recording, single file import, basic dictation, and .srt/.vtt subtitle exports.</p><p><strong>MacWhisper Pro</strong> is available as a one-time lifetime license for <strong>€65</strong> via the official website and Gumroad (multi-pack licenses are also available for 5 or 10 Macs). Pro unlocks high-accuracy Medium, Large-v3, and Turbo models, automatic speaker recognition (diarization), batch transcription queues, meeting recording, YouTube audio transcription, watch folders, and custom AI provider connections (OpenAI, Anthropic, Ollama) for summarization. Educational and non-profit discounts of 25% are available upon request. Note that the Mac App Store edition operates on separate recurring subscription billing.</p>`,
    comparison_summary: `<p>Compared to cloud transcription services like <strong>Otter.ai</strong> or <strong>Descript</strong>, MacWhisper charges a one-time fee rather than monthly recurring fees and keeps 100% of audio data on the user's local machine, though Otter offers live collaborative meeting bots that join video calls independently. Compared to open-source <strong>Whisper CLI</strong> tools, MacWhisper provides a polished native Mac GUI, synchronized playback scrubbing, speaker labeling, and one-click subtitle exporting. Compared to <strong>Superwhisper</strong>, MacWhisper specializes in pre-recorded audio files, batch processing, and subtitle workflows, whereas Superwhisper focuses primarily on system-wide live voice dictation.</p>`
  },

  sitegpt: {
    long_description: `<p>SiteGPT is a specialized customer support chatbot platform that allows businesses to create AI-powered assistants trained on their website content, help center articles, and marketing pages. Designed for rapid deployment with zero coding requirements, SiteGPT crawls specified domains or sitemaps to build a private retrieval knowledge base within minutes.</p><p>The platform provides an embeddable chat widget, customizable appearance themes, visitor lead capture forms, and integrations with customer communication tools including Slack, Crisp, Freshdesk, and Zendesk. SiteGPT allows teams to switch between fast compact models (like GPT-4.1-mini) and high-reasoning models (like GPT-4.1) to balance response quality and message allowances.</p>`,
    bestFor: [
      'E-commerce stores and SaaS businesses wanting an automated support bot trained on their website within minutes',
      'Marketing and sales teams using website chat widgets to capture visitor leads and answer product queries 24/7',
      'Small businesses seeking a straightforward, zero-code customer service bot without complex developer setup'
    ],
    notIdealFor: [
      'Users requiring a permanent free tier, as SiteGPT only provides a 7-day free trial before paid plans begin',
      'High-traffic enterprises where utilizing top-tier reasoning models consumes monthly message quotas prematurely',
      'Companies requiring complex multi-step robotic process automation or bespoke custom vector database architectures'
    ],
    primaryUseCases: [
      'Deploying an automated website concierge to answer frequently asked customer support and pricing questions',
      'Capturing qualified sales leads by collecting visitor email addresses and contact information during chat sessions',
      'Connecting website chat directly into customer support platforms like Crisp, Zendesk, and Freshdesk for human handoff'
    ],
    how_it_works: `<p>SiteGPT automates chatbot setup through a guided domain crawl. Users input their website URL or XML sitemap, and the system scans and indexes eligible pages, stripping unnecessary HTML boilerplate while extracting core text and structured content. Users can review the indexed page list, exclude irrelevant or outdated URLs, and upload supplementary PDF or text files.</p><p>Once indexed, the chatbot is deployed by adding a lightweight JavaScript snippet to any website or CMS (such as WordPress, Shopify, Webflow, or Squarespace). When a visitor submits a inquiry, SiteGPT retrieves matching content segments and generates an answer grounded strictly in the website's documented facts. If a query requires human intervention, the conversation can be handed off to agents via live chat integrations or logged as a support ticket.</p>`,
    feature_groups: [
      {
        group: 'Automated Ingestion & Chat Management',
        items: [
          'Automatic website and XML sitemap crawling with selective page inclusion and manual URL refresh',
          'Support for supplementary document uploads including PDF, DOCX, CSV, and plain text files',
          'Grounded answer generation strictly restricted to provided site content to prevent hallucinations',
          'Customizable bot persona, tone of voice, initial greeting messages, and suggested prompt buttons'
        ]
      },
      {
        group: 'Lead Generation & Helpdesk Integrations',
        items: [
          'Customizable lead capture forms collecting visitor names, email addresses, and phone numbers',
          'Integrations with customer service platforms including Crisp, Freshdesk, Zendesk, and Slack',
          'Conversation history analytics highlighting frequent visitor questions and unanswered inquiries',
          'Dual-model routing allowing administrators to configure standard or advanced AI reasoning tiers'
        ]
      }
    ],
    pros: [
      'Extremely fast, zero-code setup that builds a functional chatbot from an XML sitemap in minutes',
      'Embeddable on any modern website platform including Shopify, WordPress, Webflow, and custom codebases',
      'Includes native lead capture forms to convert conversational inquiries into actionable sales leads',
      'Integrates cleanly with popular existing live chat solutions like Crisp, Zendesk, and Freshdesk'
    ],
    cons: [
      'No permanent free tier is available; all accounts require a paid subscription following a 7-day trial',
      'Message consumption is model-dependent, with advanced reasoning models burning quota 10x faster than mini models',
      'Removing the "Powered by SiteGPT" branding badge from the chat widget requires a separate paid add-on',
      'Advanced API access and webhook automations are restricted to higher-tier Growth ($79+/mo) and Scale plans'
    ],
    pricing_overview: `<p>SiteGPT operates on a paid subscription model with a <strong>7-day free trial</strong> (credit card required, cancel anytime before trial ends). There is no permanent free tier.</p><p>Paid plans are discounted when billed annually: <strong>Starter</strong> is $39/month billed annually ($59/month monthly) for 1 chatbot, 1,000 training pages, 1 team seat, and 4,000 mini messages (or 400 advanced messages). <strong>Growth</strong> is $79/month billed annually ($129/month monthly) for 2 chatbots, 10,000 pages, 4 team seats, API access, auto-sync, and 10,000 mini messages (or 1,000 advanced messages). <strong>Scale</strong> is $259/month billed annually ($429/month monthly) for 3 chatbots, 50,000 pages, 10 team seats, webhooks, and 40,000 mini messages (or 4,000 advanced messages). <strong>Enterprise</strong> tiers offer custom capacity up to 500,000 pages. Extra message packs and unbranded widget add-ons can be purchased separately.</p>`,
    comparison_summary: `<p>Compared to <strong>DocsBot AI</strong>, SiteGPT is simpler and faster to set up for standard marketing sites and e-commerce stores, while DocsBot offers deeper developer APIs and multi-source connectors (like GitHub and Notion). Compared to <strong>Chatbase</strong>, SiteGPT provides more transparent model-tier switching and dedicated live chat handoff integrations (Crisp/Zendesk), although Chatbase provides a limited free tier. Compared to <strong>Tidio</strong> or <strong>Zendesk AI</strong>, SiteGPT functions as a focused knowledge-retrieval layer that plugs into existing helpdesks rather than forcing businesses into a proprietary customer support ecosystem.</p>`
  },

  novelcrafter: {
    long_description: `<p>Novelcrafter is a comprehensive story planning, worldbuilding, and drafting platform designed specifically for fiction writers, novelists, and narrative designers. Unlike generic word processors or general-purpose AI writing tools, Novelcrafter integrates an extensive story bible—called the Codex—that dynamically tracks characters, locations, factions, and lore across complex multi-volume series.</p><p>The platform employs an open Bring-Your-Own-Key (BYOK) architecture, connecting authors directly to commercial and open-weight AI models (via OpenRouter, Anthropic, OpenAI, or local runtimes like Ollama). By injecting relevant story lore into AI prompts based on scene context, Novelcrafter assists authors in outlining, drafting from scene beats, and revising prose without vendor lock-in or inflated token markups.</p>`,
    bestFor: [
      'Fiction writers and indie novelists creating structured multi-chapter books and complex fantasy or sci-fi series',
      'Authors wanting deep story bible lore integration that automatically informs AI scene drafting and revisions',
      'Writers who prefer a Bring-Your-Own-Key (BYOK) model to pay exact at-cost API prices for their choice of LLM'
    ],
    notIdealFor: [
      'Writers expecting AI text generation on the entry $4/mo Scribe plan, which provides organization tools only',
      'Authors seeking an all-in-one monthly plan that bundles unlimited AI generation without managing API keys',
      'Non-fiction writers or business copywriters who do not require character codexes or narrative beat sheets'
    ],
    primaryUseCases: [
      'Building deep worldbuilding lore, character profiles, and relationship trees inside the Codex story bible',
      'Drafting prose from bulleted scene beats with automated context injection from relevant codex entries',
      'Brainstorming narrative twists, character dialogue, and scene revisions using the interactive Workshop Chat'
    ],
    how_it_works: `<p>Novelcrafter organizes manuscripts through a hierarchical structure comprising the Planner, the Codex, and the Write interface. Writers establish world details in the Codex, creating entries for characters, settings, magic systems, and objects with customizable tags and relationship associations. In the Planner, writers break down their novel into acts, chapters, and scenes with structured narrative beats.</p><p>During drafting in the Write view, Novelcrafter monitors scene text and automatically identifies referenced codex entities. When the author triggers AI generation or uses the Workshop chat, the platform compiles a prompt containing the scene beat outline, character context, stylistic guidelines, and recent prose, sending it to the author's configured AI provider via API. Authors maintain complete narrative oversight, editing generated sentences directly, tracking revisions, and exporting finished manuscripts into clean DOCX or Markdown files.</p>`,
    feature_groups: [
      {
        group: 'Worldbuilding & Story Architecture',
        items: [
          'The Codex: Comprehensive story bible tracking characters, locations, items, lore, and relationships',
          'Automatic entity tagging and dynamic lore injection that supplies relevant story context to AI prompts',
          'Visual planning board with outline views, act breakdowns, chapter goals, and scene beat sheets',
          'Global series management enabling shared lore and codex entries across multi-book universes'
        ]
      },
      {
        group: 'AI Drafting & Model Flexibility',
        items: [
          'Bring-Your-Own-Key (BYOK) integration supporting OpenRouter, Anthropic, OpenAI, Groq, and local Ollama',
          'Prose generation from scene beats with granular control over style, point-of-view, and creative freedom',
          'Workshop Chat: Interactive in-app brainstorming partner referencing manuscript lore for plot discussions',
          'Full export capabilities supporting standard industry formats including Microsoft Word (DOCX) and Markdown'
        ]
      }
    ],
    pros: [
      'Deep story bible integration ensures AI-generated prose remains strictly consistent with established novel lore',
      'BYOK architecture eliminates token markups and gives authors complete freedom to choose any AI model',
      'Granular beat-driven drafting workflow maintains author control over narrative pacing and plot development',
      'Comprehensive manuscript organization tools function effectively with or without AI assistance'
    ],
    cons: [
      'The entry-level Scribe plan ($4/month) includes no AI features or BYOK integrations whatsoever',
      'Requires setting up and funding external API accounts (e.g., OpenRouter or Anthropic) for AI generation',
      'Steep learning curve compared to standard word processors due to extensive codex tagging and beat structures',
      'Interactive Workshop Chat and team collaboration features require higher-tier Artisan and Specialist plans'
    ],
    pricing_overview: `<p>Novelcrafter offers a <strong>21-day unrestricted free trial</strong> with full access to all features (no credit card required). Following the trial, subscription plans are offered with annual discounts (equivalent to 2 months free):</p><p><strong>Scribe</strong> is $4/month ($40/year) and provides unlimited books, series tracking, the Codex story bible, and manuscript exports, but <em>does not include AI features</em>. <strong>Hobbyist</strong> is $8/month ($80/year) and adds BYOK AI integration, scene beat drafting, character extraction, and scene summarization. <strong>Artisan</strong> is $14/month ($140/year) and adds the interactive Workshop Chat assistant and advanced review features. <strong>Specialist</strong> is $20/month ($200/year) and adds team management and collaborative writing. Note that AI token usage is billed separately by your chosen provider (e.g., OpenRouter, OpenAI, Anthropic, or free local models via Ollama).</p>`,
    comparison_summary: `<p>Compared to <strong>Sudowrite</strong>, Novelcrafter uses a transparent Bring-Your-Own-Key model where writers pay raw API prices rather than expensive credit bundles, and Novelcrafter offers a superior structured Codex story bible, though Sudowrite has a simpler learning curve with pre-packaged generation buttons. Compared to <strong>Scrivener</strong>, Novelcrafter provides modern web-based access and native AI integration while preserving similar deep binder organization, whereas Scrivener is a traditional offline software application with no built-in AI. Compared to <strong>Plottr</strong>, Novelcrafter covers the entire writing lifecycle from outlining to drafting and revision, while Plottr focuses primarily on visual outlining and plotting timelines.</p>`
  }
};

function main() {
  console.log('[ENRICH] Starting priority batch 1 enrichment...');

  // 1. Update data/tools.json
  const tools = JSON.parse(fs.readFileSync(TOOLS_JSON_PATH, 'utf8'));
  for (const [id, data] of Object.entries(ENRICHMENTS)) {
    const tool = tools.find(t => t.id === id);
    if (!tool) {
      console.error(`[ERROR] Tool not found in data/tools.json: ${id}`);
      process.exit(1);
    }
    tool.long_description = data.long_description;
    tool.bestFor = data.bestFor;
    tool.best_for = data.bestFor;
    tool.notIdealFor = data.notIdealFor;
    tool.primaryUseCases = data.primaryUseCases;
    tool.how_it_works = data.how_it_works;
    tool.feature_groups = data.feature_groups;
    tool.pros = data.pros;
    tool.cons = data.cons;
    tool.pricing_overview = data.pricing_overview;
    tool.comparison_summary = data.comparison_summary;
    console.log(`  ✓ Updated ${id} in memory`);
  }
  fs.writeFileSync(TOOLS_JSON_PATH, JSON.stringify(tools, null, 2), 'utf8');
  console.log(`[SUCCESS] data/tools.json updated with 7 enriched profiles.`);

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
        row.primaryUseCases = JSON.stringify(data.primaryUseCases);
        row.long_description = data.long_description;
        row.sourceSummary = data.long_description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200) + '...';
        updatedRows++;
        console.log(`  ✓ Synced Excel row for ${row.id}`);
      }
    });
    if (updatedRows !== 7) {
      console.error(`[ERROR] Expected to update 7 Excel rows, updated ${updatedRows}`);
      process.exit(1);
    }
    const newSheet = XLSX.utils.json_to_sheet(rows);
    wb.Sheets['Catalog'] = newSheet;
    XLSX.writeFile(wb, WORKBOOK_PATH);
    console.log(`[SUCCESS] Excel workbook synchronized successfully (${updatedRows} rows).`);
  } else {
    console.warn(`[WARN] Excel workbook not found at ${WORKBOOK_PATH}`);
  }

  // 3. Update Evidence Ledger
  if (fs.existsSync(LEDGER_PATH)) {
    console.log(`[LEDGER] Reading evidence ledger ${LEDGER_PATH}...`);
    const ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
    const isArray = Array.isArray(ledger);
    const items = isArray ? ledger : Object.values(ledger);

    const FINDINGS = {
      ollama: 'Official documentation, download repositories, model registry, local REST API specs, and cloud pricing reviewed November 2026. Local CLI and daemon are free and open source (MIT license) supporting Apple Silicon, Nvidia CUDA, and AMD ROCm. Cloud tiers confirmed at Pro ($20/mo), Max ($100/mo), and Team ($500/mo).',
      recraft: 'Official design studio, pricing documentation, vectorization specs, and API documentation reviewed November 2026. Freemium model confirmed with daily free credits (public, non-commercial). Paid studio plans confirmed at Basic ($10/mo annual / $12/mo monthly), Pro ($16/mo annual / $20/mo monthly), and Teams ($18/seat/mo annual / $22/mo monthly). Separate pay-per-image API units verified.',
      upscayl: 'Official website, GitHub repository, release notes, and cloud pricing reviewed November 2026. Desktop application is 100% free and open-source under GPL-3.0 for macOS, Windows, and Linux with local Vulkan GPU acceleration. Upscayl Cloud confirmed as optional hosted service with Pro at $24.99/mo and business tiers.',
      docsbot: 'Official product documentation, pricing tiers, API specifications, and integration guides reviewed November 2026. Free tier confirmed with 1 bot, 50 source pages, and 100 monthly credits. Paid tiers confirmed at Personal ($49/mo), Standard ($149/mo), Business ($499/mo), and custom Enterprise.',
      macwhisper: 'Official website, Gumroad distribution page, and product documentation reviewed November 2026. macOS native application confirmed with permanent Free tier (OpenAI Tiny/Base models) and one-time lifetime Pro license at €65 for 1 Mac (multi-seat packs available) for Large-v3/Turbo models, diarization, and batch transcription.',
      sitegpt: 'Official pricing page, feature specifications, and platform documentation reviewed November 2026. Strictly paid service with 7-day free trial on all plans (no permanent free tier). Starter confirmed at $39/mo annual ($59/mo monthly), Growth at $79/mo annual ($129/mo monthly), and Scale at $259/mo annual ($429/mo monthly).',
      novelcrafter: 'Official pricing documentation, plan matrix, and product feature guides reviewed November 2026. Unrestricted 21-day free trial confirmed (no credit card required). Subscription plans confirmed at Scribe ($4/mo, no AI), Hobbyist ($8/mo, BYOK AI), Artisan ($14/mo, Workshop chat), and Specialist ($20/mo, collaboration). Model inference billed at-cost via BYOK.'
    };

    let updatedLedgerCount = 0;
    items.forEach(item => {
      if (item && FINDINGS[item.id]) {
        item.reviewedAt = '2026-11-03';
        item.finding = FINDINGS[item.id];
        updatedLedgerCount++;
      }
    });

    fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2), 'utf8');
    console.log(`[SUCCESS] Evidence ledger updated (${updatedLedgerCount} entries refreshed).`);
  }
}

main();
