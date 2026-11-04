import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

const WORKTREE_ROOT = process.cwd();
const TOOLS_JSON_PATH = path.join(WORKTREE_ROOT, 'data/tools.json');
const WORKBOOK_PATH = path.join(WORKTREE_ROOT, 'data/WhichAIPick_Catalog_PHASE11_ANTIGRAVITY_IMPORT_CONTRACT_COMPLETE_2026-10-01.xlsx');
const LEDGER_PATH = path.join(WORKTREE_ROOT, 'data/evidence/phase11-evidence-ledger.json');

const ENRICHMENTS = {
  apify: {
    long_description: `<p>Apify is a cloud-based web scraping, crawling, and robotic data extraction platform designed for software engineers, data scientists, and automation teams. Built around a serverless execution model, Apify allows users to deploy and run containerized web scrapers—termed "Actors"—that automate browser interactions, bypass bot detection barriers, and extract structured data from complex dynamic websites.</p><p>The platform maintains the Apify Store, a marketplace containing thousands of ready-to-run open-source and proprietary Actors for services like Google Maps, Instagram, TikTok, Amazon, and YouTube. Developers can also author bespoke scrapers using Crawlee (Apify's open-source Node.js and Python crawling library) with Playwright, Puppeteer, or Selenium, running them seamlessly in the cloud with automated proxy rotation, scheduled task queues, and webhook integrations.</p>`,
    bestFor: [
      'Software engineers and data teams requiring scalable serverless infrastructure for large-scale web crawling and data pipelines',
      'Developers building AI agents and RAG applications that need continuous, automated ingestion of fresh web data',
      'Businesses monitoring competitor pricing, product catalogues, or market sentiment across complex JavaScript-rendered platforms'
    ],
    notIdealFor: [
      'Non-technical operators seeking a purely visual click-to-scrape tool without any configuration or data schema management',
      'Users looking for completely unmetered free web extraction, as free platform credits are capped at $5 per month',
      'Projects requiring low-latency real-time page rendering, as cold-start container spin-up introduces batch processing overhead'
    ],
    primaryUseCases: [
      'Extracting structured product, pricing, and review data from e-commerce platforms and social networks',
      'Feeding updated web documentation and real-time news into vector databases for Retrieval-Augmented Generation (RAG)',
      'Automating end-to-end browser workflows, form submissions, and scheduled data exports into cloud storage'
    ],
    how_it_works: `<p>Apify executes scrapers as serverless microservices called Actors. Each Actor is a lightweight container packaged with its dependencies, browser binaries (Chromium, Firefox, or WebKit), and automation scripts written in JavaScript, TypeScript, or Python. When a run is initiated via the Apify Console, API, or scheduler, Apify provisions isolated compute resources, manages residential and datacenter proxy rotation, and handles IP rate limits and anti-bot challenges automatically.</p><p>As the scraper navigates target pages, renders dynamic JavaScript DOMs, and processes pagination, extracted data is streamed into structured Apify Datasets. Users can inspect live logs in the web console, monitor memory consumption, and download results in JSON, CSV, XML, or Excel formats. Once completed, webhooks can automatically trigger downstream workflows in Zapier, Make, or custom API endpoints.</p>`,
    feature_groups: [
      {
        group: 'Serverless Crawling & Proxy Infrastructure',
        items: [
          'Serverless Actor execution engine supporting Node.js, Python, Playwright, Puppeteer, and Selenium',
          'Intelligent proxy rotation pooling residential and datacenter IP addresses with automatic session persistence',
          'Integration with Crawlee, an open-source library featuring automatic retries, concurrency management, and fingerprinting protection',
          'Configurable scheduling, webhook triggers, and queue orchestration for high-volume automated recurring jobs'
        ]
      },
      {
        group: 'Ecosystem & Data Management',
        items: [
          'Apify Store marketplace offering thousands of maintained pre-built scrapers for major web destinations',
          'Unified cloud dataset storage supporting instant exports to JSON, CSV, Excel, XML, and Parquet',
          'Official API clients for Python and JavaScript alongside command-line tooling (apify-cli)',
          'Role-based access control, team collaboration spaces, and SOC 2 / HIPAA compliance for enterprise workloads'
        ]
      }
    ],
    pros: [
      'Comprehensive developer platform eliminating the infrastructure burden of hosting headless browsers and rotating proxies',
      'Vast library of pre-built Actors in the Apify Store enables rapid data extraction without writing code from scratch',
      'Built upon battle-tested open-source libraries (Crawlee) providing reliable error recovery and rate-limiting resilience',
      'Transparent usage metering based on compute units, storage duration, and proxy data consumption'
    ],
    cons: [
      'Free tier $5 credit allowance is exhausted quickly when running resource-intensive Chromium browser automation',
      'Steep learning curve for non-developers when configuring custom Actors, proxy groups, or webhook payloads',
      'Scraping domains with aggressive bot mitigation (Cloudflare, Akamai) requires premium residential proxies that increase costs',
      'Execution logs on lower tiers are retained for only 7 to 30 days before automatic cleanup'
    ],
    pricing_overview: `<p>Apify uses a credit-based subscription model where monthly fees serve as prepaid usage credit toward Compute Units (CUs), proxy bandwidth, and dataset storage. A Compute Unit represents 1 GB of Actor RAM allocated for one hour.</p><p>The <strong>Free Plan</strong> ($0 per month) includes $5 of monthly platform usage credit, 16 GB of maximum Actor RAM, 5 datacenter proxies, and 7-day data retention. Paid plans include: <strong>Starter</strong> at $19 per month (or $17 per month billed annually at $204 per year), which includes $19 of usage credit, 64 GB of Actor RAM, 32 concurrent runs, and 30-day data retention at $0.20 per compute unit hour (CU); <strong>Scale</strong> at $199 per month (or $179 per month billed annually at $2,148 per year), including $199 of usage credit, 256 GB of Actor RAM, 128 concurrent runs, and a discounted rate of $0.16 per compute unit hour (CU); and <strong>Business</strong> at $999 per month ($899 per month billed annually). Custom enterprise contracts with dedicated infrastructure, SOC 2 compliance, and custom SLAs are also available.</p>`,
    comparison_summary: `<p>Compared to <strong>Browse AI</strong> (/tools/browse-ai/), Apify is an engineering-first platform requiring coding or technical configuration, whereas Browse AI offers a point-and-click visual browser extension suited for non-technical users. Compared to <strong>Crawl4AI</strong> (/tools/crawl4ai/), which is a local, lightweight Python web crawler designed specifically for LLM text extraction, Apify is a managed distributed cloud infrastructure providing proxy pools, task queues, and automated scheduling. Compared to <strong>Octoparse</strong> (/tools/octoparse/), Apify provides modern REST APIs, native container deployment, and extensive programmatic control across JavaScript and Python environments.</p>`,
    pricingModel: 'freemium',
    hasFreeTier: true,
    hasFreeTrial: false,
    startingPrice: 19,
    priceCurrency: 'USD',
    billingPeriod: 'month',
    trialDays: null,
    verificationSources: [
      'https://apify.com/',
      'https://apify.com/pricing',
      'https://docs.apify.com/'
    ]
  },

  apollo: {
    long_description: `<p>Apollo (Apollo.io) is an integrated B2B lead generation database and sales engagement platform designed to help sales development representatives (SDRs), account executives, and founders discover verified business prospects and automate outbound communication. The platform pairs a proprietary database of over 275 million business contacts and 73 million company profiles with multichannel sales outreach tools, cold email cadences, and CRM synchronization.</p><p>Rather than managing separate subscriptions for B2B data vendors, email sequencers, and phone dialers, Apollo provides an end-to-end sales engine. Users can build targeted buyer lists using precise technographic and firmographic filters, verify business email addresses and mobile phone numbers, enroll prospects into multi-stage email cadences, and track pipeline metrics within a single dashboard.</p>`,
    bestFor: [
      'B2B sales development representatives and account executives prospecting target accounts and managing cold outbound cadences',
      'Founders and small sales teams wanting contact intelligence and multi-step email sequencing inside one affordable platform',
      'RevOps and growth marketing professionals enriching inbound CRM leads with verified firmographic and technographic data'
    ],
    notIdealFor: [
      'B2C consumer outreach or direct-to-consumer marketing, as the database is strictly focused on business professionals',
      'Teams requiring dedicated enterprise telecommunications systems with physical hardware PBX and international call routing',
      'Organizations unwilling to verify contact bounce rates, as unverified database entries can degrade cold email sender reputation'
    ],
    primaryUseCases: [
      'Building verified prospect lists filtered by job title, department, company size, revenue, and underlying technology stack',
      'Executing automated multi-step cold outreach cadences featuring personalized emails, LinkedIn tasks, and phone calls',
      'Enriching existing records in Salesforce and HubSpot with updated job titles, corporate emails, and mobile phone numbers'
    ],
    how_it_works: `<p>Users begin by using Apollo's search interface or Chrome extension to query its B2B database. Filters allow targeting by industry, location, funding stage, hiring trends, and technologies installed on the target company's website. Prospects matching the ideal customer profile (ICP) are saved to lists, where Apollo verifies contact email deliverability and mobile phone numbers using plan credits.</p><p>Once prospect lists are established, users enroll contacts into automated Sequences. These cadences schedule multi-day outreach flows consisting of AI-personalized email drafts, automated follow-ups, manual phone call reminders through Apollo's built-in dialer, and LinkedIn connection prompts. All prospect interactions, email opens, link clicks, and booked meetings sync bidirectionally with integrated CRMs like Salesforce, HubSpot, or Pipedrive.</p>`,
    feature_groups: [
      {
        group: 'B2B Database & Contact Intelligence',
        items: [
          'Searchable database covering 275M+ verified business professionals and 73M+ companies worldwide',
          'Granular filtering across 65+ attributes including job title, company revenue, funding status, and installed technologies',
          'Chrome extension enabling contact lookup and enrichment directly on LinkedIn, company websites, and Gmail',
          'Automated data health enrichment keeping existing CRM contact and account records accurate over time'
        ]
      },
      {
        group: 'Multichannel Outreach & Sales Engagement',
        items: [
          'Automated email sequences with customizable scheduling, A/B testing, and AI-assisted personalized message drafting',
          'Built-in cloud phone dialer supporting international calling, local presence, and automated call recording',
          'Buyer intent data and website visitor tracking identifying in-market accounts researching relevant categories',
          'Bidirectional real-time CRM synchronization with Salesforce, HubSpot, and Pipedrive'
        ]
      }
    ],
    pros: [
      'Combines high-volume B2B contact data and sales outreach sequencing into a unified, cost-effective platform',
      'Generous free plan allows early-stage founders to test data quality and run basic prospecting without upfront commitments',
      'Browser extension provides seamless contact capture directly from LinkedIn profiles and corporate websites',
      'Comprehensive filtering capabilities include niche technographics and company growth metrics'
    ],
    cons: [
      'Contact data accuracy varies across international regions and smaller private companies, requiring periodic email hygiene checks',
      'Mobile phone number credits and high-tier intent data consume credit allocations rapidly on standard plans',
      'Advanced features like custom intent signals, comprehensive reporting, and dialer minutes require higher-tier subscriptions',
      'Platform interface can feel overwhelming due to the sheer density of navigation menus and configuration settings'
    ],
    pricing_overview: `<p>Apollo uses a per-seat monthly or annual subscription model supplemented by credit allotments for contact email verification and direct mobile phone numbers.</p><p>The <strong>Free Plan</strong> ($0 per month) includes 900 email credits per year (granted in monthly batches), basic search filters, and limited email sequencing. Paid plans include: <strong>Basic</strong> at $59 per seat per month (or $49 per seat per month billed annually at $588 per year), providing 30,000 email credits per year, unlimited email sequencing, and standard CRM integrations; <strong>Professional</strong> at $99 per seat per month (or $79 per seat per month billed annually at $948 per year), which adds 48,000 email credits per year, a built-in dialer, call recording, and A/B testing; and <strong>Organization</strong> at $149 per seat per month (or $119 per seat per month billed annually at $1,428 per year, with a 3-seat minimum), including 72,000 email credits per year, advanced intent data, customizable permissions, and SSO. A 14-day free trial is available for paid tiers.</p>`,
    comparison_summary: `<p>Compared to legacy enterprise databases like ZoomInfo, Apollo provides a significantly more accessible self-serve pricing model with built-in email sequencing, making it ideal for startups and mid-market teams. Compared to dedicated email sequencers like <strong>Zapier AI</strong> (/tools/zapier-ai/) or standalone outreach tools, Apollo eliminates the need to import external CSV lead lists by providing native contact records directly inside the sequencing interface.</p>`,
    pricingModel: 'freemium',
    hasFreeTier: true,
    hasFreeTrial: true,
    startingPrice: 59,
    priceCurrency: 'USD',
    billingPeriod: 'month',
    trialDays: 14,
    verificationSources: [
      'https://www.apollo.io/',
      'https://www.apollo.io/pricing',
      'https://knowledge.apollo.io/'
    ]
  },

  audiopen: {
    long_description: `<p>AudioPen is an AI-powered voice recording and text summarization application designed to convert unstructured, stream-of-consciousness spoken notes into clean, coherent written prose. Instead of producing dense, unedited verbatim transcripts full of verbal fillers and circular thoughts, AudioPen acts as a personal editor—restructuring ideas, fixing grammatical inconsistencies, and outputting polished notes ready for immediate publication or sharing.</p><p>Accessible via web browsers, progressive web apps, and mobile devices, AudioPen provides a frictionless capturing experience for writers, entrepreneurs, executives, and individuals who articulate ideas more naturally out loud than on a keyboard. Users can choose from multiple writing styles, combine related thoughts into comprehensive summaries, and integrate notes with task management tools via webhooks.</p>`,
    bestFor: [
      'Busy professionals, executives, and founders who want to capture spoken reflections and generate clear draft emails or memos',
      'Writers, journalists, and content creators brainstorming article outlines and stream-of-consciousness thoughts while walking',
      'Individuals with ADHD, dyslexia, or typing fatigue who find verbal ideation faster and less cognitively draining than typing'
    ],
    notIdealFor: [
      'Legal, medical, or courtroom transcription requiring verbatim word-for-word accuracy and timestamped speaker attribution',
      'Teams recording multi-hour conference meetings with overlapping speakers, as the tool is designed for individual voice capture',
      'Users needing real-time live captions during video calls or public presentations'
    ],
    primaryUseCases: [
      'Dictating thoughts while commuting or walking and receiving structured, well-punctuated notes ready for project documentation',
      'Converting rambling spoken reflections into concise executive summaries, daily journal entries, or social media posts',
      'Synthesizing multiple recorded thoughts on a single topic into a cohesive long-form outline using the SuperSummaries feature'
    ],
    how_it_works: `<p>Users launch AudioPen on their mobile device or desktop browser and tap the microphone icon to begin recording. As the user speaks naturally, AudioPen captures the raw audio stream. When recording finishes, the audio is processed by speech recognition models to extract the semantic meaning of the spoken words.</p><p>Next, specialized language model prompts analyze the transcription. The system automatically filters out verbal hesitations, repeated phrases, and false starts, restructuring the underlying ideas according to the user's chosen style (e.g., Clear, Professional, Casual, Academic, or Bullet Points). The resulting note is saved to the user's library, where it can be edited, tagged, grouped into folders, or exported via Zapier and custom webhooks.</p>`,
    feature_groups: [
      {
        group: 'Voice Capture & Intelligent Synthesis',
        items: [
          'High-accuracy speech recognition converting natural voice dictation into clear, well-structured text',
          'Automatic removal of filler words, repeated thoughts, and grammatical hesitations without losing context',
          'Multiple selectable rewrite styles including Clear, Casual, Professional, Academic, and Bulleted List',
          'Customizable AI writing voice allowing Prime subscribers to train the system to mirror their personal tone'
        ]
      },
      {
        group: 'Organization, Summaries & Integrations',
        items: [
          'SuperSummaries capability enabling users to merge multiple independent voice notes into a unified document',
          'Audio file upload support allowing existing voice memos (up to 100 MB each) to be converted into structured text',
          'Tagging, folder management, and cross-device synchronization across iOS, Android, macOS, and Windows',
          'Integration with productivity tools through Zapier, Make, and webhook automation'
        ]
      }
    ],
    pros: [
      'Produces coherent, publishable prose rather than tedious verbatim transcripts that require extensive manual cleanup',
      'Simple, lightweight user interface with near-zero friction for spontaneous mobile voice note capture',
      'Prepaid access pass pricing model offers a welcome alternative to recurring auto-renewing subscriptions',
      'SuperSummaries feature provides excellent value for compiling disparate research thoughts into a cohesive outline'
    ],
    cons: [
      'Free plan limits voice recordings to 3 minutes each and stores only the 10 most recent notes in the library',
      'Does not provide speaker diarization or multi-speaker labeling for group meeting environments',
      'Not suitable for verbatim transcription workflows where every exact word, hesitation, and timestamp must be preserved',
      'Third-party integrations require an active Prime pass'
    ],
    pricing_overview: `<p>AudioPen offers a permanent Free tier alongside AudioPen Prime, which is sold as non-renewing prepaid access passes rather than recurring auto-billed subscriptions.</p><p>The <strong>Free Plan</strong> ($0 forever) allows voice recordings of up to 3 minutes per note, basic rewrite styles, and storage for up to 10 notes. <strong>AudioPen Prime</strong> unlocks recordings up to 15 minutes, unlimited note storage, audio file uploads (up to 100 MB per file, up to 100 files per 4-week cycle), custom writing styles, SuperSummaries, and webhook integrations. Prime pricing tiers include: a <strong>3-Month Pass</strong> for $33 total ($11 per month equivalent); a <strong>1-Year Pass</strong> for $99 total ($8.25 per month equivalent); and a <strong>2-Year Pass</strong> for $159 total ($6.63 per month equivalent). Users maintain full commercial ownership of all generated text notes.</p>`,
    comparison_summary: `<p>Compared to <strong>Otter.ai</strong> (/tools/otterai/), which focuses on multi-speaker meeting transcription with verbatim timestamps, AudioPen focuses on individual thought capture, deliberately rewriting rambling audio into structured, publishable prose. Compared to <strong>MacWhisper</strong> (/tools/macwhisper/), which runs OpenAI Whisper models locally on macOS devices for exact transcription, AudioPen is a cloud-based writing assistant that refines and styles your thoughts. Compared to <strong>Descript</strong> (/tools/descript/), which is a complete audio and video editing suite, AudioPen is a lightweight note-taking utility designed for rapid everyday ideation.</p>`,
    pricingModel: 'freemium',
    hasFreeTier: true,
    hasFreeTrial: false,
    startingPrice: 11,
    priceCurrency: 'USD',
    billingPeriod: 'month',
    trialDays: null,
    verificationSources: [
      'https://www.audiopen.ai/',
      'https://www.audiopen.ai/faq'
    ]
  },

  auphonic: {
    long_description: `<p>Auphonic is an automated audio post-production and mastering web service established in 2011 to streamline podcasting, broadcast, and spoken-word audio engineering. Combining traditional acoustic digital signal processing (DSP) algorithms with modern machine learning models, Auphonic automatically balances audio levels, eliminates background noise, and normalizes overall volume to meet international broadcast and streaming standards.</p><p>The platform eliminates the need for manual dynamic compression, multi-band equalization, and loudness meter auditing in digital audio workstations (DAWs). Content creators upload raw voice recordings, and Auphonic outputs mastered audio files conforming to standard podcast guidelines (such as -16 LUFS), complete with speech-to-text transcripts, automatic chapter marks, and multi-track audio leveling.</p>`,
    bestFor: [
      'Podcasters, broadcasters, and YouTubers wanting broadcast-standard loudness and clean acoustics without mastering expertise',
      'Content teams producing interview podcasts where host and remote guest microphone levels differ substantially',
      'Audio creators needing fast, automated background noise and room hum reduction across batch recordings'
    ],
    notIdealFor: [
      'Music producers requiring manual creative multi-track mixing, artistic vocal pitch correction, or custom DAW automation',
      'Broadcasters looking for zero-latency live audio processing, as Auphonic operates as a cloud-based batch mastering service',
      'Creators wanting to edit out specific spoken words or rearrange video timelines, which is better handled in tools like Descript'
    ],
    primaryUseCases: [
      'Mastering podcast episodes to the standard -16 LUFS loudness target with balanced speaker levels and true peak limiting',
      'Cleaning up noisy remote interview recordings by removing electrical hum, room reverb, and air conditioning hiss',
      'Generating synchronized automated speech-to-text transcripts and chapter markers for publishing on podcast directories'
    ],
    how_it_works: `<p>Users upload single-track or multi-track audio files to the Auphonic web platform or trigger processing via API or cloud storage integrations (Dropbox, Google Drive). Auphonic's signal processing engine analyzes the audio file to calculate loudness statistics (LUFS/LKFS), dynamic range, and acoustic frequency spectrum distribution.</p><p>Next, the service applies an adaptive leveler to smooth volume discrepancies between speakers. An intelligent loudness normalizer adjusts the track to target specifications (e.g., -16 LUFS for stereo podcasts, -19 LUFS for mono, or -23 LUFS for European broadcast). Algorithms filter low-frequency rumble, suppress noise and hum, and auto-duck background music during voiceovers. Processed audio is delivered in multiple formats (MP3, AAC, WAV, FLAC) with embedded metadata and chapter marks.</p>`,
    feature_groups: [
      {
        group: 'Acoustic Mastering & Dynamic Leveling',
        items: [
          'Loudness normalization conforming to international broadcast and streaming standards (EBU R128, ATSC A/85, Apple, Spotify)',
          'Adaptive multitrack leveling that harmonizes distinct microphone inputs and eliminates crosstalk between speakers',
          'Dynamic noise and hum suppression that identifies and removes constant background noise, hum, and room reverb',
          'Auto-ducking algorithms that lower background music or ambient sound beds whenever voice dialogue is detected'
        ]
      },
      {
        group: 'Metadata, Transcripts & Distribution',
        items: [
          'Automatic speech recognition generating multi-language transcripts with timestamped speaker identification',
          'Automated chapter mark generation and metadata tagging (ID3, Vorbis comments) for podcast distribution',
          'Direct cloud publishing integrations with Dropbox, Google Drive, YouTube, Libsyn, Podbean, and Amazon S3',
          'Comprehensive REST API enabling automated integration within enterprise audio and media management pipelines'
        ]
      }
    ],
    pros: [
      'Consistently delivers professional broadcast-standard audio mastering without requiring deep acoustic engineering skills',
      'Multitrack algorithm excels at balancing dialogue and removing crosstalk from remote multi-mic interviews',
      'Generous recurring free plan provides 2 hours of processed audio every month for independent creators',
      'Flexible payment options support both monthly recurring subscriptions and non-expiring one-time credit top-ups'
    ],
    cons: [
      'Free plan audio outputs append an audible Auphonic promotional jingle/watermark at the end of files',
      'Unused monthly subscription hours reset each billing period and do not roll over to future months',
      'Batch processing time depends on server queue depth and file duration, making it unsuitable for live stream audio',
      'Web interface is functional and technical but lacks modern graphical visualizer wave editors'
    ],
    pricing_overview: `<p>Auphonic provides a free monthly plan alongside recurring monthly subscriptions and non-expiring one-time credit packages based on total processed audio duration.</p><p>The <strong>Free Plan (XS)</strong> includes 2 hours of processed audio per month ($0 per month, no credit card required); free hours reset monthly without rollover and output files include an Auphonic audio watermark. <strong>Recurring Monthly Plans</strong> include: <strong>Small (S)</strong> at $13 per month (or $11 per month billed annually at $132 per year) or €12 per month for 9 hours of audio; <strong>Medium (M)</strong> at $26 per month ($22 per month billed annually) for 21 hours; <strong>Large (L)</strong> at $52 per month ($44 per month billed annually) for 45 hours; and <strong>Extra Large (XL)</strong> at $104 per month ($88 per month billed annually) for 100 hours. Unused subscription hours do not roll over. Creators needing irregular processing can purchase <strong>One-Time Credits</strong> that never expire, including 9 hours for $14 (€13), 25 hours for $36 (€34), or 100 hours for $125 (€119).</p>`,
    comparison_summary: `<p>Compared to <strong>Cleanvoice</strong> (/tools/cleanvoice/), which specializes in surgically detecting and cutting out filler words ("ums"), mouth smacks, and stuttering, Auphonic focuses on acoustic mastering, loudness normalization, dynamic compression, and broadcast compliance. Compared to <strong>Descript</strong> (/tools/descript/), which is an all-in-one text-based media editor with "Studio Sound" enhancement, Auphonic is a dedicated, API-driven audio processing utility designed to master audio batches without changing content or editing video timelines.</p>`,
    pricingModel: 'freemium',
    hasFreeTier: true,
    hasFreeTrial: false,
    startingPrice: 13,
    priceCurrency: 'USD',
    billingPeriod: 'month',
    trialDays: null,
    verificationSources: [
      'https://auphonic.com/',
      'https://auphonic.com/pricing',
      'https://auphonic.com/help'
    ]
  },

  bito: {
    long_description: `<p>Bito (Bito AI) is an AI developer productivity platform and automated code review assistant designed to assist software engineering teams throughout the development lifecycle. Operating through extensions in popular integrated development environments (IDEs) like Visual Studio Code and JetBrains, as well as native Git bots on GitHub, GitLab, and Bitbucket, Bito automates routine programming tasks, code reviews, and technical documentation.</p><p>Bito acts as an intelligent pair programmer inside the editor—generating code, explaining complex algorithms, creating unit test suites, and identifying potential security vulnerabilities. At the repository level, Bito's automated review agent analyzes Pull Requests line-by-line, highlighting architectural risks, missing boundary checks, and performance bottlenecks before human senior engineers conduct reviews.</p>`,
    bestFor: [
      'Software engineers and developers seeking fast in-IDE code completions, test generation, and complex code explanations',
      'Engineering managers and tech leads looking to automate initial Pull Request code reviews and reduce review cycle times',
      'Development teams wanting an AI assistant that integrates smoothly across both VS Code and the JetBrains suite'
    ],
    notIdealFor: [
      'Non-developers seeking no-code automation or general conversational writing assistance without code context',
      'Organizations requiring 100% air-gapped on-premise execution on lower-tier self-serve plans',
      'Teams expecting fully autonomous software development without human engineering oversight and validation'
    ],
    primaryUseCases: [
      'Conducting automated line-level Pull Request code reviews in GitHub, GitLab, and Bitbucket with contextual comments',
      'Generating unit test suites and edge-case mocks for existing functions directly inside the code editor',
      'Drafting comprehensive Pull Request descriptions and release changelogs by analyzing git diff changesets'
    ],
    how_it_works: `<p>Developers install the Bito plugin in their preferred IDE (VS Code or JetBrains) and connect Bito's Git app to their code repositories. Inside the editor, developers interact with Bito via keyboard shortcuts or chat. Bito indexes relevant local project context, providing syntax completions, refactoring recommendations, and automated documentation generation based on state-of-the-art language models.</p><p>When a developer opens a Pull Request on GitHub, GitLab, or Bitbucket, Bito's automated review bot triggers via webhook. It inspects the changeset against repository context, evaluates coding conventions, checks for potential security flaws, and posts structured review comments directly on specific lines of code. It also outputs an executive PR summary outlining what changed and flagging high-risk modifications for human reviewers.</p>`,
    feature_groups: [
      {
        group: 'In-IDE AI Pair Programming',
        items: [
          'Contextual AI code generation and completion supporting Python, JavaScript, TypeScript, Go, Java, C++, and more',
          'One-click unit test generation creating mocks, assertion suites, and edge-case test scaffolding',
          'Code explanation and legacy codebase walkthroughs clarifying complex algorithms and regular expressions',
          'Automated security scanning identifying hardcoded credentials, injection vectors, and anti-patterns'
        ]
      },
      {
        group: 'Automated Pull Request Reviews',
        items: [
          'Line-level automated Pull Request reviews across GitHub, GitLab, and Bitbucket pull requests',
          'Automatic generation of comprehensive PR summaries detailing modifications, scope, and technical context',
          'Downstream impact analysis alerting developers to potential breaking API changes across dependencies',
          'Enterprise security governance with custom review rules and SOC 2 Type II compliance'
        ]
      }
    ],
    pros: [
      'Strong dual focus on in-editor code assistance and automated repository-level Pull Request review workflows',
      'First-class support across both VS Code and JetBrains IDE families (IntelliJ, PyCharm, WebStorm, Android Studio)',
      'PR review bot catches obvious bugs and missing test cases before senior engineers begin manual review',
      'Free tier available for individual developers working on open-source and personal repositories'
    ],
    cons: [
      'Automated PR review line volume is capped at 5,000 lines of code per seat per month on the Team plan',
      'Complex multi-file architectural refactoring can produce occasional false-positive suggestions requiring human verification',
      'Enterprise self-hosted and private cloud deployments require custom sales contracts',
      'Requires team consensus to avoid noise from automated GitHub bot comments on small minor commits'
    ],
    pricing_overview: `<p>Bito offers a free plan for individual developers alongside per-seat monthly and annual subscriptions for software engineering teams.</p><p>The <strong>Free Plan</strong> ($0 per month) provides individual developers with in-IDE AI chat, basic code completions, and high-level PR summaries on public or personal repositories. The <strong>Team Plan</strong> is priced at $15 per seat per month (or $12 per seat per month billed annually at $144 per seat per year), unlocking line-level automated PR code reviews (up to 5,000 lines of code reviewed per seat/month), downstream impact analysis, and team collaboration settings. The <strong>Professional Plan</strong> is $25 per seat per month ($20 per seat per month billed annually at $240 per seat per year) for higher review limits, advanced model access, and priority support; it includes a 14-day free trial. Custom <strong>Enterprise Plans</strong> provide custom line allowances, dedicated VPC/on-premise deployment options, SSO/SAML, and tailored review rules.</p>`,
    comparison_summary: `<p>Compared to <strong>GitHub Copilot</strong> (/tools/github-copilot/), which focuses primarily on in-line code autocomplete inside the editor, Bito places strong emphasis on automated Pull Request code reviews and PR summary generation in GitHub and GitLab. Compared to <strong>Cursor</strong> (/tools/cursor/), which is a standalone AI-first code editor fork of VS Code, Bito is an extension that developers can install directly into their existing VS Code or JetBrains development environments. Compared to <strong>Aider</strong> (/tools/aider/), which is a terminal-based autonomous pair-programming agent, Bito provides graphical IDE integration and cloud-based team PR review bots.</p>`,
    pricingModel: 'freemium',
    hasFreeTier: true,
    hasFreeTrial: true,
    startingPrice: 15,
    priceCurrency: 'USD',
    billingPeriod: 'month',
    trialDays: 14,
    verificationSources: [
      'https://bito.ai/',
      'https://bito.ai/pricing/',
      'https://docs.bito.ai/'
    ]
  },

  botsonic: {
    long_description: `<p>Botsonic is a no-code conversational AI chatbot platform developed by Writesonic that enables businesses to build, train, and deploy intelligent customer support agents. By indexing company websites, help center documentation, PDF manuals, and internal knowledge bases, Botsonic creates customized conversational assistants that resolve customer queries around the clock with verifiable citations.</p><p>The platform is designed to automate Tier-1 customer support inquiries, reduce agent ticketing queues, and capture inbound sales leads. Botsonic features omnichannel deployment across website embed widgets, WhatsApp, Facebook Messenger, Slack, and Telegram, while offering Agentic Actions that connect directly with external APIs to look up order statuses, update customer records, or trigger human agent handoffs in Zendesk or Intercom.</p>`,
    bestFor: [
      'E-commerce merchants, SaaS platforms, and digital agencies wanting 24/7 automated customer support deflection without writing code',
      'Customer support teams needing to connect AI chatbots with Zendesk, Freshdesk, or Intercom for automated Tier-1 resolution',
      'Operations teams looking to deploy custom internal HR or IT helpdesk chatbots across Slack or WhatsApp'
    ],
    notIdealFor: [
      'Organizations requiring a completely free ongoing chatbot solution, as Botsonic does not offer a permanent free plan',
      'Companies needing complex conversational voice telephony bots with real-time interactive voice response (IVR)',
      'Highly custom machine learning deployments requiring raw Python model fine-tuning and proprietary self-hosted vector stores'
    ],
    primaryUseCases: [
      'Deflecting routine customer service tickets by providing instant, cited answers to shipping, refund, and product questions',
      'Automating lead capture and appointment scheduling across website chat widgets and WhatsApp messaging channels',
      'Executing live transactional API actions, such as looking up tracking numbers or checking user account balances'
    ],
    how_it_works: `<p>Setting up Botsonic involves connecting company knowledge sources. Users provide a website URL, sitemap, help center link, or upload documents (PDF, DOCX, CSV). Botsonic ingests the content, breaks it into semantic chunks, and builds a vector retrieval index. System prompts allow administrators to customize the bot's name, brand persona, greeting messages, and strictness guidelines to prevent hallucinations.</p><p>When a customer asks a question via the web widget or messaging app, Botsonic retrieves relevant passages from the verified knowledge base and generates an accurate, cited response using underlying LLM models like GPT-4o. If a question requires live data, Botsonic triggers configured Agentic Actions via REST APIs. If an issue requires human assistance, the bot automatically routes the conversation to live agents in Zendesk, Intercom, or email.</p>`,
    feature_groups: [
      {
        group: 'No-Code Knowledge Ingestion & Training',
        items: [
          'Automated sitemap crawling and document upload (PDF, DOCX, CSV, TXT) with automatic periodic re-syncing',
          'Strict hallucination controls restricting chatbot responses strictly to verified uploaded source content',
          'Customizable branding, avatar, theme styling, and suggested starter prompts matching website design',
          'Multi-language conversational support automatically detecting and responding in 50+ languages'
        ]
      },
      {
        group: 'Omnichannel Deployment & Agentic Actions',
        items: [
          'Omnichannel publishing to embeddable website widgets, WhatsApp, Slack, Telegram, and Facebook Messenger',
          'Agentic Actions enabling the chatbot to trigger external REST API calls, check order statuses, and book meetings',
          'Seamless human agent handoff with native integrations for Zendesk, Freshdesk, Intercom, and LiveChat',
          'Comprehensive analytics dashboard tracking deflection rates, customer sentiment, and unresolved question gaps'
        ]
      }
    ],
    pros: [
      'Extremely rapid setup allows businesses to deploy an accurate, branded customer service bot in under 15 minutes',
      'Agentic Actions capability allows the chatbot to perform actual API tasks rather than merely answering static questions',
      'Strong omnichannel connectivity supporting WhatsApp, Slack, and web chat from a centralized knowledge base',
      'Clear conversation transcripts and analytics help teams identify documentation blind spots and product issues'
    ],
    cons: [
      'No permanent free tier; access requires subscribing to a paid plan after a 7-day free trial',
      'Starter tier message quota (1,000 messages per month) can be consumed quickly by moderate-traffic commercial stores',
      'Advanced API workflow integrations and high message capacities require the higher-tier $299/month plan',
      'Multi-sitemap synchronization and team collaboration features are restricted to higher tiers'
    ],
    pricing_overview: `<p>Botsonic operates on a paid monthly or annual subscription model based on message volumes, team seats, and active chatbots. A 7-day free trial is available on paid plans.</p><p>The <strong>Starter Plan</strong> is priced at $19 per month (or $16 per month billed annually at $192 per year), including 1 team seat, 1,000 messages per month, 1 chatbot, 10 million characters of knowledge storage, and 3 Agentic Actions powered by GPT-4o mini. The <strong>Professional Plan</strong> is $49 per month (or $41 per month billed annually at $492 per year), providing 2 team seats, 3,000 messages per month, 2 chatbots, 50 million characters, 5 Agentic Actions, and integrations for Slack and Calendly with GPT-4o model access. The <strong>Advanced Plan</strong> is $299 per month ($249 per month billed annually at $2,988 per year), expanding to 5 seats, 12,000 messages per month, unlimited sitemaps, API access, and 10 Agentic Actions. Custom <strong>Enterprise Plans</strong> offer custom message caps, dedicated account managers, and enterprise SLAs.</p>`,
    comparison_summary: `<p>Compared to <strong>DocsBot</strong> (/tools/docsbot/), Botsonic offers broader native messaging integrations (WhatsApp, Telegram) and built-in Agentic Action API triggers, while DocsBot offers dedicated documentation search widgets and WordPress plugins. Compared to <strong>SiteGPT</strong> (/tools/sitegpt/), which focuses on simple, reliable website sitemap scraping and chat widgets, Botsonic provides deeper integrations with Zendesk and Calendly. Compared to <strong>Botpress</strong> (/tools/botpress/), which is a comprehensive visual conversational developer studio, Botsonic is a streamlined no-code tool focused specifically on customer service deflection.</p>`,
    pricingModel: 'paid',
    hasFreeTier: false,
    hasFreeTrial: true,
    startingPrice: 19,
    priceCurrency: 'USD',
    billingPeriod: 'month',
    trialDays: 7,
    verificationSources: [
      'https://botsonic.com/',
      'https://botsonic.com/pricing',
      'https://docs.botsonic.com/'
    ]
  },

  chroma: {
    long_description: `<p>Chroma (Chroma DB) is an open-source, AI-native vector embedding database designed to serve as the long-term memory layer for large language model applications, semantic search engines, and autonomous agents. Focused on developer simplicity, Chroma allows software engineers to store document embeddings, associate metadata, and perform sub-millisecond nearest-neighbor vector search queries with minimal setup overhead.</p><p>Chroma can be deployed directly in-memory, embedded inside Python and TypeScript applications, or executed as a client-server architecture in Docker and Kubernetes clusters. For production scaling, Chroma Cloud provides a managed serverless platform that separates compute from object storage, delivering elastic scaling and pay-as-you-go vector search without database management operational complexity.</p>`,
    bestFor: [
      'AI engineers and Python/TypeScript developers building Retrieval-Augmented Generation (RAG) applications and agent memory',
      'Startups and researchers wanting a completely free, local open-source vector store that runs embedded without external cloud accounts',
      'Engineering teams looking for seamless integration with modern LLM orchestration frameworks like LangChain and LlamaIndex'
    ],
    notIdealFor: [
      'Non-developers seeking a turnkey visual dashboard or graphical document search interface without code integration',
      'Enterprise architectures requiring complex relational joins, ACID transactions, and traditional SQL constraints',
      'Projects requiring multi-region active-active distributed write synchronization on the self-hosted community edition'
    ],
    primaryUseCases: [
      'Storing and querying document vector embeddings for local or cloud-hosted Retrieval-Augmented Generation (RAG) pipelines',
      'Powering semantic search and recommendation systems using vector similarity metrics (cosine, inner product, L2 distance)',
      'Implementing persistent multi-turn conversational memory and contextual knowledge retrieval for autonomous AI agents'
    ],
    how_it_works: `<p>Developers initialize Chroma locally via Python (<code>pip install chromadb</code>) or TypeScript (<code>npm install chromadb</code>). Chroma allows creating Collections of documents. When documents or text passages are added, Chroma uses integrated embedding models (such as Sentence Transformers, OpenAI, or Cohere) or accepts pre-computed vector arrays, indexing them alongside structured key-value metadata.</p><p>When an application queries the collection, Chroma computes the query embedding and performs Approximate Nearest Neighbor (ANN) search using HNSW indexing algorithms. Chroma combines vector similarity with boolean metadata filters, returning the most semantically relevant document chunks and their associated metadata. In cloud deployments, Chroma Cloud leverages serverless compute workers decoupled from cloud object storage, executing queries efficiently at scale.</p>`,
    feature_groups: [
      {
        group: 'Vector Indexing & Semantic Search',
        items: [
          'High-performance Approximate Nearest Neighbor (ANN) search using HNSW vector indexing algorithms',
          'Support for multiple vector similarity distance metrics: Cosine similarity, Squared L2 distance, and Inner Product',
          'Rich hybrid querying combining vector similarity scoring with precise metadata and full-text keyword filtering',
          'Built-in embedding function wrappers supporting OpenAI, HuggingFace, Cohere, and local Sentence Transformers'
        ]
      },
      {
        group: 'Deployment & Developer Ecosystem',
        items: [
          'Flexible execution modes: in-memory for testing, embedded local SQLite/DuckDB, or client-server Docker deployment',
          'Official first-party client libraries for Python and JavaScript/TypeScript with active community SDKs',
          'Native integration with LangChain, LlamaIndex, Ollama, AutoGPT, and popular AI framework stacks',
          'Chroma Cloud managed serverless architecture featuring collection forking and pay-as-you-go elastic scaling'
        ]
      }
    ],
    pros: [
      '100% open-source under the permissive Apache 2.0 license with zero commercial restrictions for self-hosting',
      'Minimal setup friction: embedded mode allows developers to begin prototyping in Python with just three lines of code',
      'Comprehensive ecosystem integration across virtually every major LLM library (LangChain, LlamaIndex, Instructor)',
      'Chroma Cloud provides a managed serverless alternative that separates storage and compute for cost-effective scaling'
    ],
    cons: [
      'Self-hosted embedded mode relies on local storage and is not architected for multi-node horizontal write scaling',
      'Does not provide an out-of-the-box graphical administration user interface for inspecting collections visually',
      'High-throughput real-time write workloads on serverless cloud setups require careful monitoring of per-GiB write costs',
      'Relies on external relational or document databases when applications require complex ACID transactional state'
    ],
    pricing_overview: `<p>Chroma is fundamentally open-source software that is free to self-host, complemented by a managed serverless offering on Chroma Cloud.</p><p>The <strong>Self-Hosted Open Source Edition</strong> is 100% free forever ($0) under the Apache 2.0 license, allowing unlimited local and server deployments without licensing fees. <strong>Chroma Cloud</strong> is a fully managed serverless vector platform offering a <strong>Starter Tier</strong> ($0 per month) with $5 in free monthly usage credits to support development and testing. Paid Chroma Cloud consumption is billed on a pay-as-you-go basis: storage is priced at approximately $0.33 per GiB-month; writes (adds and updates) are billed at approximately $2.50 per logical GiB written (billed per transfer); and queries are metered at $0.0075 per TiB queried (billed per scan volume) plus $0.09 per GiB of returned data (billed per egress transfer), with collection forking available at $0.03 per request (one-time operation fee). Custom <strong>Enterprise Contracts</strong> provide dedicated single-tenant VPC deployments, private networking, and custom SLAs.</p>`,
    comparison_summary: `<p>Compared to <strong>Pinecone</strong> (/tools/pinecone/), which is a proprietary closed-source cloud service, Chroma is fully open-source under Apache 2.0 and can run entirely offline on a developer's laptop. Compared to <strong>Weaviate</strong> (/tools/weaviate/) and <strong>Qdrant</strong> (/tools/qdrant/), which are full-featured standalone vector search engines written in Go and Rust, Chroma emphasizes a lightweight, embedded developer experience that integrates directly inside Python and TypeScript runtime processes.</p>`,
    pricingModel: 'freemium',
    hasFreeTier: true,
    hasFreeTrial: false,
    startingPrice: 0,
    priceCurrency: 'USD',
    billingPeriod: 'month',
    trialDays: null,
    verificationSources: [
      'https://www.trychroma.com/',
      'https://docs.trychroma.com/',
      'https://github.com/chroma-core/chroma'
    ]
  },

  conker: {
    long_description: `<p>Conker is an AI-powered formative assessment and quiz creation platform designed specifically for educators, instructional designers, and school institutions. Created by Mote Technologies, Conker enables teachers to generate curriculum-aligned quizzes, comprehension tests, and practice worksheets from any topic, reading passage, or source article in a matter of seconds.</p><p>Rather than manually authoring dozens of multiple-choice and fill-in-the-blank questions, teachers can customize assessments based on target grade levels, national curriculum standards (such as NGSS, TEKS, and Common Core), and accessibility requirements. Quizzes can be assigned directly to students through shareable web links, exported seamlessly to Google Forms and Canvas LMS, or printed as clean physical worksheets with complete answer keys.</p>`,
    bestFor: [
      'K-12 teachers and university instructors wanting to generate curriculum-aligned check-for-understanding quizzes in seconds',
      'Educators differentiating instructional assessments for mixed-ability classrooms and English-language learners (ELL)',
      'Schools and school districts heavily integrated with Google Classroom, Google Forms, and Canvas LMS ecosystems'
    ],
    notIdealFor: [
      'Corporate HR departments seeking high-stakes employee certification testing with strict proctoring and identity verification',
      'Advanced technical coding instructors requiring automated software code execution and unit test sandboxing',
      'Casual trivia creators looking for gamified live team buzzer animations in the style of Kahoot'
    ],
    primaryUseCases: [
      'Generating a 10-question formative assessment from a news article or textbook chapter to evaluate student comprehension',
      'Exporting AI-generated quizzes directly into Google Forms or Canvas LMS for automatic grading and gradebook recording',
      'Creating printed practice quiz sheets with corresponding teacher answer keys for classroom review sessions'
    ],
    how_it_works: `<p>Teachers begin by visiting Conker and choosing a prompt method: entering a specific educational topic, pasting a source reading text (up to 5,000 words on Pro), or linking an external web article. Teachers select target parameters including grade level (from elementary through higher education), question count, question types (multiple choice, true/false, multi-select, or fill-in-the-blank), and language.</p><p>Conker's AI generates the assessment questions, providing verified answer keys and contextual rationales explaining why specific answers are correct. Teachers can edit questions, shuffle choices, and add custom items. Once finalized, the quiz can be launched in Conker's student-friendly online mode, shared via QR code, exported to Google Forms with one click, or downloaded as a printable PDF worksheet.</p>`,
    feature_groups: [
      {
        group: 'Assessment Generation & Curriculum Alignment',
        items: [
          'Rapid quiz generation from custom topics, pasted reading texts, and web article URLs',
          'Curriculum standard alignment covering NGSS, TEKS, Common Core, and UK national curricula',
          'Multiple question formats including Multiple Choice, Multi-Select, True/False, and Fill-in-the-Blank',
          'Integrated read-aloud voice accessibility powered by Mote audio technology for emergent and ELL readers'
        ]
      },
      {
        group: 'Export, Grading & LMS Integrations',
        items: [
          'One-click direct export to Google Forms, allowing automated student response collection and grading',
          'Canvas LMS integration supporting seamless assignment creation and gradebook synchronization',
          'Print-ready worksheet exports generating clean student question pages and teacher answer keys',
          'Student response analytics providing instant question-level breakdown to identify classroom learning gaps'
        ]
      }
    ],
    pros: [
      'Drastically reduces teacher preparation time by generating high-quality comprehension assessments in under a minute',
      'Direct integration with Google Forms and Google Classroom fits naturally into existing public school workflows',
      'Built-in audio read-aloud support ensures accessibility for early readers, dyslexic students, and English learners',
      'Very affordable individual teacher pricing ($5.99/month) with a functional free tier for occasional use'
    ],
    cons: [
      'Free tier restricts teachers to sharing 5 quizzes and collecting a maximum of 50 student responses total',
      'Input source text on the free plan is capped at 1,200 words, requiring truncation of longer chapters',
      'Does not provide gamified, competitive live classroom animations like Kahoot or Quizizz',
      'Canvas LMS integration and centralized administrative roster management require a custom Schools contract'
    ],
    pricing_overview: `<p>Conker offers a functional Free plan for individual teachers alongside affordable Pro subscriptions and custom district licensing.</p><p>The <strong>Free Plan</strong> ($0 per month) allows educators to create and share up to 5 quizzes, collect up to 50 total student responses, create up to 10 questions per quiz, and input up to 1,200 words of source reading material. The <strong>Pro Plan</strong> is priced at $5.99 per month (or approximately $4.99 per month billed annually at roughly $59.99 per year), providing unlimited quizzes, unlimited student responses, up to 40 questions per quiz, expanded 5,000-word reading input, advanced quiz analytics, and priority support. The <strong>Schools Plan</strong> provides custom institutional pricing for schools and districts, adding Canvas LMS integration, district administrator dashboards, and custom branding. Conker complies with standard student data privacy regulations (FERPA and COPPA).</p>`,
    comparison_summary: `<p>Compared to <strong>Diffit</strong> (/tools/diffit/), which focuses on adapting reading materials into leveled passages, vocabulary lists, and interactive student activities, Conker is focused specifically on assessment generation, quiz question authoring, and direct Google Forms / Canvas export. Compared to general AI chatbots like ChatGPT, Conker formats questions with answer keys, aligns content directly with K-12 learning standards, and provides student-safe testing interfaces without ad tracking.</p>`,
    pricingModel: 'freemium',
    hasFreeTier: true,
    hasFreeTrial: false,
    startingPrice: 5.99,
    priceCurrency: 'USD',
    billingPeriod: 'month',
    trialDays: null,
    verificationSources: [
      'https://www.conker.ai/',
      'https://www.conker.ai/pricing',
      'https://www.conker.ai/faq'
    ]
  },

  explainpaper: {
    long_description: `<p>Explainpaper is an AI-powered academic reading assistant designed to help researchers, university students, academics, and professionals understand dense technical publications. Originally built to demystify complex machine learning research, the web-based reader allows users to upload academic PDFs and highlight confusing jargon, statistical methodologies, or mathematical formulas to receive instant, plain-English explanations.</p><p>Instead of requiring users to copy-paste passages back and forth into external conversational bots, Explainpaper keeps the explanation embedded in the reading context. Users can ask follow-up questions grounded directly in the paper, inspect figures and charts with visual explanations, and reference structured section outlines that facilitate rapid literature reviews.</p>`,
    bestFor: [
      'Graduate students, PhD researchers, and academics reading dense peer-reviewed literature across unfamiliar disciplines',
      'Biotech, pharmaceutical, and technology analysts dissecting scientific preprints and technical patent filings',
      'Undergraduate students transitioning from textbooks to primary research publications and scientific journals'
    ],
    notIdealFor: [
      'Users needing automated multi-paper citation synthesis or systematic literature mapping across millions of papers',
      'Readers working with low-resolution scanned image PDFs without underlying OCR text layers',
      'Teams requiring strict local on-premise execution with zero cloud document upload for defense or proprietary assets'
    ],
    primaryUseCases: [
      'Demystifying dense scientific terminology, complex methodology passages, and mathematical notation in research preprints',
      'Speed-reading academic literature reviews by reviewing auto-generated section outlines and key finding summaries',
      'Visually explaining charts, graphs, and experimental data figures using the Snap Explain feature'
    ],
    how_it_works: `<p>Users upload an academic PDF to Explainpaper or import papers directly from their Zotero reference library. The document renders in an interactive two-pane web reader. When a reader encounters a confusing sentence, equation, or acronym, they highlight the specific text passage with their cursor.</p><p>Explainpaper analyzes the highlighted passage in relation to the surrounding document context and generates a plain-language explanation in the side panel. Readers can adjust explanation complexity (e.g., Explain to a 5-year-old vs. Undergrad) and ask follow-up conversational questions grounded in the paper. With the Snap Explain tool, users can draw a box around charts, graphs, or equations to receive visual interpretations of experimental results.</p>`,
    feature_groups: [
      {
        group: 'Contextual Paper Reading & Explanation',
        items: [
          'Inline highlight-to-explain interface providing instant plain-English breakdowns of dense academic prose',
          'Snap Explain visual tool allowing readers to crop figures, graphs, and equations for multimodal AI analysis',
          'Adjustable explanation complexity levels tailored from novice overview to domain-specific technical nuance',
          'Interactive conversational follow-up questions grounded strictly within the uploaded document context'
        ]
      },
      {
        group: 'Academic Workflow & Organization',
        items: [
          'Full-paper executive summaries distilling core research contributions, methodology, and primary limitations',
          'Interactive paper navigation outline with clickable section links for rapid document navigation',
          'Zotero reference manager integration synchronizing research libraries directly with the web reader',
          'Smart Highlight Memory saving all annotated passages and explanations for subsequent literature review writing'
        ]
      }
    ],
    pros: [
      'Solves the friction of reading dense academic papers by providing contextual explanations directly on the reading canvas',
      'Snap Explain feature provides excellent visual interpretation of complex scientific charts and data plots',
      'Direct Zotero integration fits smoothly into existing academic research and reference management habits',
      'Generous free plan allows unlimited highlight explanations with standard language models'
    ],
    cons: [
      'Free tier relies on standard AI models that may miss subtle domain nuances compared to Pro frontier models',
      'Does not perform automated cross-paper meta-analysis or search external citation databases like Consensus',
      'PDF text selection can falter on older scanned historical documents with poor optical character recognition (OCR)',
      'Document uploads are subject to file size limits (~50 MB per PDF)'
    ],
    pricing_overview: `<p>Explainpaper offers a permanent Free tier for casual academic reading alongside a Pro subscription for researchers needing advanced frontier AI models and visual document tools.</p><p>The <strong>Free Plan</strong> ($0 per month) includes unlimited highlight explanations using standard AI models, follow-up questions, and Zotero library integration. The <strong>Pro Plan</strong> is priced at $16 per month (or $12 per month billed annually at $144 per year, saving 25%), which includes a 7-day free trial; Pro unlocks advanced frontier AI models (such as Claude 3.5 Sonnet and GPT-4o), full-paper executive summaries with key takeaways, Snap Explain for charts and equations, interactive section navigation outlines, and smart highlight memory. Institutional and <strong>Teams Plans</strong> with centralized billing and collaborative research workspaces are available upon contacting sales.</p>`,
    comparison_summary: `<p>Compared to <strong>ChatPDF</strong> (/tools/chatpdf/), which provides a generic conversational chat panel beside a PDF, Explainpaper provides inline text highlighting and visual chart cropping designed specifically for academic reading. Compared to <strong>Consensus</strong> (/tools/consensus/), which searches across a database of 200M+ research papers to synthesize scientific consensus, Explainpaper is a deep-reading assistant for dissecting individual papers. Compared to <strong>Scholarcy</strong> (/tools/scholarcy/), which automatically generates structured summary flashcards from papers, Explainpaper is an interactive active-reading tool.</p>`,
    pricingModel: 'freemium',
    hasFreeTier: true,
    hasFreeTrial: true,
    startingPrice: 16,
    priceCurrency: 'USD',
    billingPeriod: 'month',
    trialDays: 7,
    verificationSources: [
      'https://www.explainpaper.com/',
      'https://www.explainpaper.com/pricing',
      'https://www.explainpaper.com/about'
    ]
  },

  gumloop: {
    long_description: `<p>Gumloop is an AI-native workflow automation and autonomous agent platform that allows growth teams, operations specialists, and developers to build complex multi-step data pipelines and automated web workflows using a visual drag-and-drop canvas. Designed to bridge the gap between rigid no-code automation platforms and complex code-only AI frameworks, Gumloop enables teams to orchestrate state-of-the-art language models, web scrapers, and Python scripts without managing cloud infrastructure.</p><p>The platform provides specialized native nodes for AI tasks—such as scraping JavaScript-rendered websites with proxy rotation, extracting tabular data from PDFs, routing prompts across top frontier models (OpenAI, Anthropic, Gemini), and executing custom Python functions. With built-in human-in-the-loop review checkpoints, scheduled triggers, and webhook integrations, Gumloop automates end-to-end operational processes that previously required bespoke software development.</p>`,
    bestFor: [
      'Growth marketers and operations managers building multi-step AI research, lead enrichment, and web scraping pipelines',
      'Automation specialists needing visual node-based workflow orchestration with native support for frontier AI models and Python code',
      'Startups and agencies automating complex document extraction, customer onboarding, and competitive intelligence workflows'
    ],
    notIdealFor: [
      'Casual personal users looking for simple 2-step app triggers (such as saving email attachments to Dropbox), where Zapier is simpler',
      'Engineering teams requiring strict 100% on-premise self-hosted orchestration without cloud SaaS dependencies',
      'Users requiring an ongoing permanent free tier, as Gumloop operates on a 14-day free trial on its Pro subscription'
    ],
    primaryUseCases: [
      'Automating competitive intelligence pipelines that scrape competitor websites daily, summarize changes, and post alerts to Slack',
      'Extracting structured transaction and invoice data from multi-page PDF documents into Google Sheets or relational databases',
      'Executing automated B2B sales lead qualification by enriching company websites, verifying domains, and drafting personalized outreach'
    ],
    how_it_works: `<p>Users construct automation pipelines by placing and connecting modular nodes on Gumloop's visual flowchart canvas. Input nodes capture trigger events via webhooks, scheduled cron intervals, manual triggers, or file uploads. Processing nodes perform discrete operations: web scraping with automatic proxy rotation, document parsing, LLM prompt execution, or custom Python data transformations.</p><p>During workflow execution, Gumloop runs the pipeline in the cloud with complete visibility, displaying real-time execution states and input/output payloads at each node. Users can insert Human-in-the-Loop review steps that pause execution until an operator approves or edits an output. Once validated, workflows deliver structured results to external destinations including Google Sheets, Airtable, Notion, Slack, or webhooks.</p>`,
    feature_groups: [
      {
        group: 'Visual AI Pipeline Orchestration',
        items: [
          'Drag-and-drop node canvas orchestrating multi-step AI workflows, conditional branching, and loops',
          'Native web scraping nodes featuring dynamic JavaScript rendering, automatic proxy rotation, and CAPTCHA handling',
          'Multi-model LLM routing supporting OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, Google Gemini, and open-source models',
          'Custom Python code execution nodes allowing inline data wrangling and third-party library calls'
        ]
      },
      {
        group: 'Operational Governance & Integrations',
        items: [
          'Human-in-the-loop review nodes enabling manual verification and approval before downstream workflow continuation',
          'Credit-based unified billing metering token usage, compute time, and third-party API tool calls',
          'Extensive integration library connecting with Google Workspace, Airtable, Notion, Slack, Zapier, and REST webhooks',
          'Company Brain knowledge repository and GitHub Skill Sync for reusable team workflow templates'
        ]
      }
    ],
    pros: [
      'Combines visual no-code flow builder simplicity with advanced AI scraping, document parsing, and Python code flexibility',
      'Significantly more capable for complex AI reasoning and multi-step data pipelines than traditional automation platforms like Zapier',
      'Human-in-the-loop review checkpoints prevent inaccurate AI outputs from propagating into production systems',
      'Unified credit model allows users to access 35+ frontier AI models without managing separate API provider subscriptions'
    ],
    cons: [
      'The current public pricing page does not advertise an ongoing free tier; getting started requires enrolling in a 14-day Pro trial with a payment method',
      'High-frequency scraping and heavy token-consumption workflows consume monthly credits quickly, requiring credit monitoring',
      'An 8% platform orchestration fee is applied to underlying model token costs (or 16% when bringing your own API keys)',
      'Unused monthly credits on the Pro plan do not roll over to subsequent billing periods'
    ],
    pricing_overview: `<p>Gumloop operates on a paid subscription model starting at $37 per month for the Pro plan (with annual billing discounts available). While historical documentation described an ongoing 5,000-credit free tier, Gumloop's current public pricing structure does not advertise an ongoing free tier, instead providing a 14-day free trial on the Pro tier (which requires a credit card upfront) with 20,000 monthly credits.</p><p>The <strong>Pro Plan</strong> starts at $37 per month (or approximately $29 per month when billed annually), including 20,000 credits per month (7,400 base credits plus 12,600 bonus credits), unlimited team members, 5 concurrent workflow runs, 25 concurrent agent chats, access to 35+ AI models, and email support. Credits meter model token usage, compute execution, and tool calls, indexed at approximately $0.005 per credit, with an 8% platform orchestration fee applied to tasks. Credit overages can be purchased as needed on paid accounts. The <strong>Enterprise Plan</strong> features custom pricing, custom credit allocations with credit rollover, dedicated Slack support, custom MCP server hosting, and SOC 2 / HIPAA compliance.</p>`,
    comparison_summary: `<p>Compared to <strong>Zapier AI</strong> (/tools/zapier-ai/), Gumloop provides significantly deeper capabilities for complex AI reasoning, web scraping, document extraction, and Python code execution, whereas Zapier excels at simple two-step SaaS integrations. Compared to <strong>n8n</strong> (/tools/n8n/), which is a fair-code workflow automation tool that can be self-hosted on private servers, Gumloop is a fully managed cloud-native platform with native AI agent capabilities. Compared to <strong>Apify</strong> (/tools/apify/), which is a code-centric scraping infrastructure platform, Gumloop provides a visual canvas designed for operational workflows combining scraping with LLM reasoning.</p>`,
    pricingModel: 'paid',
    hasFreeTier: false,
    hasFreeTrial: true,
    startingPrice: 37,
    priceCurrency: 'USD',
    billingPeriod: 'month',
    trialDays: 14,
    verificationSources: [
      'https://www.gumloop.com/',
      'https://www.gumloop.com/pricing',
      'https://docs.gumloop.com/'
    ]
  }
};

const FINDINGS = {
  apify: 'Official product documentation, platform architecture specifications, and credit-based pricing reviewed November 2026. Freemium model confirmed with Free Plan ($5/mo free prepaid usage credit, 16 GB max Actor RAM, 5 included datacenter proxies, 7-day data retention). Paid plans confirmed at Starter ($19/mo monthly / $17/mo annual at $204/yr, $19 credit, 64 GB RAM, 32 runs, $0.20/CU), Scale ($199/mo monthly / $179/mo annual at $2,148/yr, $199 credit, 256 GB RAM, 128 runs, $0.16/CU), Business ($999/mo monthly / $899/mo annual), and custom Enterprise.',
  apollo: 'Official B2B lead generation database, email sequencing features, Chrome extension capabilities, and pricing reviewed November 2026. Freemium model confirmed with Free Plan ($0/mo, 900 email credits/yr granted monthly, basic filters, limited sequences). Paid plans confirmed at Basic ($59/seat/mo monthly / $49/seat/mo annual at $588/yr, 30k email credits/yr, unlimited sequences, CRM sync), Professional ($99/seat/mo monthly / $79/seat/mo annual at $948/yr, 48k email credits/yr, dialer, call recording, A/B testing), Organization ($149/seat/mo monthly / $119/seat/mo annual at $1,428/yr, 3-seat minimum, 72k credits/yr, intent data), and custom Enterprise. 14-day free trial available for paid plans.',
  audiopen: 'Official voice note application, rewrite style options, PWA interface, and non-renewing access pass pricing reviewed November 2026. Freemium model confirmed with Free Plan ($0 forever, 3-minute voice notes, basic rewrite styles, 10 note storage). AudioPen Prime confirmed as non-renewing prepaid access passes at 3-Month Pass ($33 total, $11/mo equivalent), 1-Year Pass ($99 total, $8.25/mo equivalent), and 2-Year Pass ($159 total, $6.63/mo equivalent) unlocking 15-minute voice recordings, unlimited note storage, audio file uploads (up to 100 MB each, 100 files/4 weeks), custom writing styles, SuperSummaries, and webhook integrations.',
  auphonic: 'Official audio post-production specifications, broadcast loudness standards (EBU R128, -16 LUFS), and pricing reviewed November 2026. Freemium model confirmed with Free Plan XS ($0/mo, 2 hours/mo processed audio, credits reset monthly without rollover, includes audio watermark). Recurring subscriptions confirmed at Small S ($13/mo monthly / $11/mo annual at $132/yr or €12/mo, 9 hours/mo), Medium M ($26/mo monthly / $22/mo annual, 21 hours/mo), Large L ($52/mo monthly / $44/mo annual, 45 hours/mo), and Extra Large XL ($104/mo monthly / $88/mo annual, 100 hours/mo). One-time non-expiring credits confirmed at 9 hours ($14 / €13), 25 hours ($36 / €34), and 100 hours ($125 / €119).',
  bito: 'Official IDE extensions (VS Code, JetBrains), GitHub/GitLab PR review bot, security scanning, and pricing reviewed November 2026. Freemium model confirmed with Free Plan ($0/mo for individual developers, AI chat in IDEs, basic completions, public repo PR summaries). Paid team plans confirmed at Team ($15/seat/mo monthly / $12/seat/mo annual at $144/seat/yr, 5,000 lines of code reviewed per seat/month, line-level PR suggestions, impact analysis), Professional ($25/seat/mo monthly / $20/seat/mo annual at $240/seat/yr, 14-day free trial), and custom Enterprise (VPC/on-premise deployment, custom review rules, SSO/SAML, SOC 2 Type II).',
  botsonic: 'Official conversational AI agent platform, omnichannel connectors, agentic actions, and pricing reviewed November 2026. Paid service with a 7-day free trial on paid plans (no permanent free tier). Subscriptions confirmed at Starter ($19/mo monthly / $16/mo annual at $192/yr, 1 seat, 1,000 messages/mo, 1 chatbot, 10M characters, 3 Agentic Actions, GPT-4o mini), Professional ($49/mo monthly / $41/mo annual at $492/yr, 2 seats, 3,000 messages/mo, 2 chatbots, 50M characters, 5 Agentic Actions, GPT-4o, Slack/Calendly sync), Advanced ($299/mo monthly / $249/mo annual at $2,988/yr, 5 seats, 12,000 messages/mo, unlimited sitemaps, API access), and custom Enterprise.',
  chroma: 'Official GitHub repository, documentation, Apache 2.0 open-source licensing, and Chroma Cloud serverless pricing reviewed November 2026. Open-Source Edition confirmed 100% free forever ($0) under Apache 2.0 license for self-hosting. Chroma Cloud serverless confirmed with Starter Tier ($0/mo with $5 free monthly usage credits). Usage-based consumption confirmed at ~$0.33 per GiB-month storage, ~$2.50 per logical GiB written, ~$0.0075 per TiB queried, ~$0.09 per GiB returned, and ~$0.03 per collection fork. Custom Enterprise contracts available for dedicated VPC, private networking, and custom SLAs.',
  conker: 'Official K-12 and higher-ed assessment builder by Mote Technologies Ltd., curriculum alignment standards (Common Core, NGSS, TEKS), and pricing reviewed November 2026. Freemium model confirmed with Free Plan ($0/mo, share up to 5 quizzes, 50 student responses, 10 questions/quiz, 1,200 words reading input). Conker Pro confirmed at $5.99/mo monthly (or ~$4.99/mo billed annually at ~$59.99/yr) unlocking unlimited quizzes, unlimited student responses, up to 40 questions per quiz, 5,000 words reading input, quiz analytics, and Google Forms/Canvas export. Custom Schools plans available for school districts.',
  explainpaper: 'Official academic PDF reader interface, Snap Explain visual figure interpretation, Zotero reference sync, and pricing reviewed November 2026. Freemium model confirmed with Free Plan ($0/mo, unlimited highlight explanations with standard AI models, follow-up questions, Zotero library integration). Explainpaper Pro confirmed at $16/mo monthly (or $12/mo billed annually at $144/yr, saving 25%, 7-day free trial) unlocking frontier AI models (Claude 3.5 Sonnet / GPT-4o), full-paper summaries with key takeaways, Snap Explain for charts/equations, clickable section navigation outlines, and smart highlight memory. Custom Teams plans available.',
  gumloop: 'Official visual AI workflow canvas, web scraping nodes, document extraction engine, and pricing reviewed November 2026. Paid service with a 14-day free trial of the Pro plan (credit card required upfront; current public pricing does not advertise an ongoing free tier). Subscriptions confirmed at Pro starting at $37/mo monthly (or ~$29/mo billed annually) with 20,000 monthly credits (7,400 base + 12,600 bonus), unlimited seats, 5 concurrent runs, 25 agent chats, 35+ AI models, and an 8% task orchestration fee. Credit overage priced at ~$0.005 per credit. Enterprise tier adds custom credit allowances with rollover, dedicated Slack channel, custom MCP servers, and SOC 2 / HIPAA compliance.'
};

function main() {
  console.log('======================================================');
  console.log('WHICHAIPICK BATCH 3 CONTENT ENRICHMENT');
  console.log('Targeting 10 Priority Skeletal V1 Profiles');
  console.log('======================================================\n');

  const targetIds = Object.keys(ENRICHMENTS);
  console.log(`Target Cohort (${targetIds.length} tools): ${targetIds.join(', ')}`);

  // 1. Update tools.json
  if (!fs.existsSync(TOOLS_JSON_PATH)) {
    console.error(`[ERROR] tools.json not found at ${TOOLS_JSON_PATH}`);
    process.exit(1);
  }

  const tools = JSON.parse(fs.readFileSync(TOOLS_JSON_PATH, 'utf8'));
  console.log(`[CATALOGUE] Loaded ${tools.length} tools from data/tools.json`);

  for (const id of targetIds) {
    const data = ENRICHMENTS[id];
    const tool = tools.find(t => t.id === id);
    if (!tool) {
      console.error(`[ERROR] Target tool ${id} not found in tools.json`);
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
    tool.pricingModel = data.pricingModel;
    tool.pricing_model = data.pricingModel;
    tool.hasFreeTier = data.hasFreeTier;
    tool.has_free_tier = data.hasFreeTier;
    tool.hasFreeTrial = data.hasFreeTrial;
    tool.startingPrice = data.startingPrice;
    tool.priceCurrency = data.priceCurrency;
    tool.billingPeriod = data.billingPeriod;
    tool.trialDays = data.trialDays;
    tool.verificationSources = data.verificationSources;
    tool.reviewedAt = '2026-11-04';
    tool.evidenceReviewedAt = '2026-11-04';
    tool.editorialStatus = 'source_based_summary';
    console.log(`  ✓ Updated ${id} in data/tools.json`);
  }
  fs.writeFileSync(TOOLS_JSON_PATH, JSON.stringify(tools, null, 2), 'utf8');
  console.log(`[SUCCESS] data/tools.json updated with 10 enriched Batch 3 profiles.\n`);

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
        row.pricingModel = data.pricingModel;
        row.hasFreeTier = data.hasFreeTier ? 'TRUE' : 'FALSE';
        row.hasFreeTrial = data.hasFreeTrial ? 'TRUE' : 'FALSE';
        row.startingPrice = data.startingPrice;
        row.priceCurrency = data.priceCurrency;
        row.billingPeriod = data.billingPeriod;
        row.trialDays = data.trialDays;
        row.verificationSources = JSON.stringify(data.verificationSources);
        row.reviewedAt = '2026-11-04';
        updatedRows++;
        console.log(`  ✓ Synced Excel row for ${row.id}`);
      }
    });
    if (updatedRows !== 10) {
      console.error(`[ERROR] Expected to update 10 Excel rows, updated ${updatedRows}`);
      process.exit(1);
    }
    const newSheet = XLSX.utils.json_to_sheet(rows);
    wb.Sheets['Catalog'] = newSheet;
    XLSX.writeFile(wb, WORKBOOK_PATH);
    console.log(`[SUCCESS] Excel workbook synchronized successfully (${updatedRows} rows).\n`);
  } else {
    console.warn(`[WARN] Excel workbook not found at ${WORKBOOK_PATH}`);
  }

  // 3. Update Evidence Ledger
  if (fs.existsSync(LEDGER_PATH)) {
    console.log(`[LEDGER] Reading evidence ledger ${LEDGER_PATH}...`);
    const ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
    const isArray = Array.isArray(ledger);
    const items = isArray ? ledger : Object.values(ledger);

    let updatedLedgerCount = 0;
    const handledIds = new Set();

    items.forEach(item => {
      if (item && FINDINGS[item.id]) {
        item.reviewedAt = '2026-11-04';
        item.finding = FINDINGS[item.id];
        if (ENRICHMENTS[item.id] && ENRICHMENTS[item.id].verificationSources && ENRICHMENTS[item.id].verificationSources[0]) {
          item.sourceURL = ENRICHMENTS[item.id].verificationSources[0];
        }
        handledIds.add(item.id);
        updatedLedgerCount++;
        console.log(`  ✓ Updated evidence ledger record for ${item.id} (${item.evidenceId})`);
      }
    });

    // If any tool was missing in ledger, append a new entry
    let nextNum = 1332;
    for (const id of targetIds) {
      if (!handledIds.has(id)) {
        const newEvidenceId = `E${nextNum++}`;
        const newEntry = {
          evidenceId: newEvidenceId,
          id: id,
          fieldScope: 'identity;category;directory_summary;pricing',
          sourceURL: ENRICHMENTS[id].verificationSources[0] || 'https://whichaipick.com/',
          reviewedAt: '2026-11-04',
          method: 'source_review',
          finding: FINDINGS[id]
        };
        items.push(newEntry);
        updatedLedgerCount++;
        console.log(`  ✓ Created new evidence ledger record for ${id} (${newEvidenceId})`);
      }
    }

    fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2), 'utf8');
    console.log(`[SUCCESS] Evidence ledger updated (${updatedLedgerCount} entries refreshed).\n`);
  }
}

main();
