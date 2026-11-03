import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

const WORKTREE_ROOT = process.cwd();
const TOOLS_JSON_PATH = path.join(WORKTREE_ROOT, 'data/tools.json');
const WORKBOOK_PATH = path.join(WORKTREE_ROOT, 'data/WhichAIPick_Catalog_PHASE11_ANTIGRAVITY_IMPORT_CONTRACT_COMPLETE_2026-10-01.xlsx');
const LEDGER_PATH = path.join(WORKTREE_ROOT, 'data/evidence/phase11-evidence-ledger.json');

const ENRICHMENTS = {
  'browse-ai': {
    long_description: `<p>Browse AI is a no-code web automation and data extraction platform designed to convert any website into a structured API or monitoring workflow. By leveraging a point-and-click browser extension, users can train software robots to navigate pages, extract tabular data, handle pagination, and detect visual changes without writing scraping scripts or maintaining headless browser infrastructure.</p><p>The service handles underlying web scraping complexities automatically, including dynamic JavaScript rendering, IP proxy rotation, geolocation targeting, and CAPTCHA handling. Extracted datasets can be scheduled for recurring runs and pushed directly into tools like Google Sheets, Airtable, Zapier, Make, or custom webhooks.</p>`,
    bestFor: [
      'E-commerce operators and pricing analysts needing automated competitor price monitoring and stock tracking without engineering support',
      'Growth marketers and lead generation specialists extracting structured directory listings and job board postings into spreadsheets',
      'Operations teams requiring real-time change detection alerts on vendor portals, government registries, or competitor landing pages'
    ],
    notIdealFor: [
      'Enterprise scraping operations requiring millions of high-frequency page extractions where raw API services like ScraperAPI or Bright Data are more cost-efficient',
      'Complex single-page applications requiring deep multi-step authenticated session state beyond basic cookie injection',
      'Teams expecting free ongoing high-volume data extraction, as the free tier is capped at 50 credits per month'
    ],
    primaryUseCases: [
      'Extracting structured product, price, and inventory data from e-commerce websites on scheduled intervals',
      'Monitoring competitor websites for price adjustments, product launches, and regulatory announcements',
      'Converting unstructured web tables and search results into automated Google Sheets and webhook streams'
    ],
    how_it_works: `<p>Browse AI operates through a Chromium browser extension that records user interactions on a live target webpage. The user clicks on page elements to define what data to extract—such as product titles, prices, image URLs, or table rows—and specifies whether the robot should navigate pagination buttons, scroll infinitely, or enter search terms. The system uses machine learning to adapt to minor DOM and CSS layout changes automatically, preventing scrapers from breaking when target websites update their frontend code.</p><p>Once trained, the robot is deployed to Browse AI's cloud infrastructure. Users configure execution schedules (from every 5 minutes on high tiers to daily or weekly runs). When executed, Browse AI provisions residential or data center proxies, renders the target website's dynamic scripts, solves potential verification challenges, parses the designated fields, and delivers the structured data via CSV download, Google Sheets synchronization, or REST webhook notifications.</p>`,
    feature_groups: [
      {
        group: 'No-Code Robot Training & Extraction',
        items: [
          'Point-and-click interface to extract text, links, image URLs, and tabular lists from dynamic web pages',
          'Automated pagination and infinite scrolling handling to capture multi-page product catalogues',
          'Prebuilt robot templates for popular platforms including LinkedIn, Amazon, Product Hunt, and Eventbrite',
          'Adaptive element selector algorithms that tolerate minor structural and layout modifications'
        ]
      },
      {
        group: 'Monitoring, Infrastructure & Integrations',
        items: [
          'Automated change monitoring with visual diffs and customizable email alerts when specific metrics change',
          'Built-in residential and data center proxy rotation with CAPTCHA solving capabilities',
          'Native integrations with Google Sheets, Airtable, Zapier, Make, and incoming/outgoing REST webhooks',
          'Role-based team workspaces with shared robot libraries and concurrent task orchestration'
        ]
      }
    ],
    pros: [
      'Fast robot training through a visual browser extension with zero programming or XPath knowledge required',
      'Automated handling of proxies, CAPTCHAs, and JavaScript execution eliminates backend scraper hosting maintenance',
      'Direct two-way synchronization with Google Sheets and Airtable allows non-technical teams to maintain automated pipelines',
      'Visual change monitoring provides clear screenshot comparisons alongside structured field updates'
    ],
    cons: [
      'Credit consumption scales rapidly on anti-bot protected domains (like LinkedIn or Amazon), consuming up to 10x standard credits',
      'Unused monthly plan credits do not roll over across billing cycles, penalizing irregular seasonal usage',
      'Complex multi-step user interaction flows (e.g., interactive drop-downs and dynamic filters) can be challenging to configure reliably',
      'Free tier is limited to 50 monthly credits and 2 websites, serving primarily as an evaluation trial'
    ],
    pricing_overview: `<p>Browse AI operates on a credit-based subscription model, where 1 credit typically covers 10 extracted data rows on standard websites, while sites with heavy bot protections require additional credit multipliers.</p><p>The <strong>Free Plan</strong> ($0 forever) provides 50 credits per month, allowing extraction from up to 2 websites with 3 user seats. Paid tiers include: <strong>Personal</strong> at $48/month (or $19/month billed annually at $228/year) with 2,000 monthly credits, 5 monitored websites, and 1-hour check frequency; <strong>Professional</strong> at $87/month (or $69/month billed annually at $828/year) with 5,000 monthly credits, 10 monitored websites, 10 user seats, and high-frequency monitoring down to 5-minute intervals; and <strong>Premium/Enterprise</strong> starting at $500+/month billed annually with 600,000+ annual credits, dedicated IP pools, custom rate limits, and white-glove onboarding. Credit top-ups can be purchased as needed on paid accounts.</p>`,
    comparison_summary: `<p>Compared to <strong>Apify</strong>, Browse AI offers a significantly easier visual no-code onboarding experience for non-developers, whereas Apify is an engineering-first platform with an extensive open-source Actor library (Crawlee, Puppeteer, Playwright) suited for custom code and massive scale. Compared to desktop scrapers like <strong>Octoparse</strong>, Browse AI runs entirely in the cloud with native webhook integrations, avoiding the need for dedicated desktop client execution. Compared to <strong>Parseur</strong>, which specializes in parsing unstructured text from emails and existing documents, Browse AI focuses on extracting live web data directly from rendered browser DOMs.</p>`
  },

  chatpdf: {
    long_description: `<p>ChatPDF is an AI-powered document analysis application that allows users to query, summarize, and extract information from PDF documents through a conversational interface. Built on large language model embeddings and retrieval-augmented generation (RAG), the platform turns dense academic papers, financial filings, legal contracts, and textbooks into interactive reference documents.</p><p>Users upload documents to generate instant executive summaries and recommended questions, followed by semantic search querying. Every response includes direct page citations, allowing users to verify facts against the original source text without reading entire multi-hundred-page manuscripts.</p>`,
    bestFor: [
      'University students and academic researchers reviewing literature reviews, journal articles, and textbooks',
      'Legal professionals, paralegals, and compliance officers needing rapid passage location and contractual clause cross-referencing',
      'Financial analysts and business consultants dissecting quarterly 10-K filings, annual reports, and industry whitepapers'
    ],
    notIdealFor: [
      'Scanned image-only PDFs with poor or absent optical character recognition (OCR), which require dedicated OCR pre-processing',
      'Users requiring strict local offline data isolation with zero cloud upload of proprietary or confidential documents',
      'Complex cross-document relational synthesis across hundreds of disparate files simultaneously, which exceeds single-workspace limits'
    ],
    primaryUseCases: [
      'Extracting key findings, methodology details, and conclusions from academic research papers',
      'Cross-referencing legal obligations, indemnification clauses, and termination terms across commercial agreements',
      'Generating plain-language summaries and study guides from lengthy technical manuals and textbooks'
    ],
    how_it_works: `<p>When a user uploads a PDF to ChatPDF, the service extracts the text content, breaks it into contextual chunks, and generates semantic vector embeddings that index the entire document structure. An introductory prompt automatically synthesizes the document's core thesis and suggests three contextually relevant starter questions.</p><p>When a user submits a query, ChatPDF retrieves the most relevant semantic passages from the vector index and feeds them alongside the user query into the underlying language model. The model generates a synthesized answer that cites specific page numbers corresponding to the original text. Users can click on cited page numbers to jump directly to the verified passage in the integrated document viewer.</p>`,
    feature_groups: [
      {
        group: 'Document Ingestion & Semantic Retrieval',
        items: [
          'Instant PDF processing with automatic document summarization and suggested exploration prompts',
          'Retrieval-augmented generation (RAG) delivering verifiable answers grounded in uploaded document text',
          'Direct page-level citations linking conversational claims directly to the source text location',
          'Support for multi-language document translation and conversational cross-lingual queries'
        ]
      },
      {
        group: 'Workspace & File Management',
        items: [
          'Multi-document folders enabling unified conversational querying across grouped reference files',
          'Persistent chat history and exportable conversational transcripts for note-taking workflows',
          'Shareable chat links allowing colleagues or classmates to interact with pre-indexed document sessions',
          'Cloud storage encryption with secure file deletion upon user workspace removal'
        ]
      }
    ],
    pros: [
      'Extremely fast onboarding with zero required account setup for basic queries on public files',
      'Accurate page citations make fact-checking straightforward and reduce model hallucination risk',
      'Folder organization allows researchers to query multiple related papers within a single contextual thread',
      'Clean, distraction-free interface focused purely on rapid document understanding and note extraction'
    ],
    cons: [
      'Free tier limits (2 PDFs per day and 120 pages per file) are restrictive for heavy daily academic or legal research',
      'Does not include advanced native OCR for low-resolution scanned historical documents or handwritten notes',
      'Cannot execute mathematical formulas or complex spreadsheet-style calculations across extracted financial tables',
      'Data is processed on cloud servers, making it unsuitable for strictly regulated air-gapped security protocols'
    ],
    pricing_overview: `<p>ChatPDF follows a freemium model with a free tier and a single paid subscription for power users.</p><p>The <strong>Free Plan</strong> ($0) requires no credit card and allows users to process up to 2 PDFs per day, with limits of 120 pages and 10 MB per document, capped at 50 questions daily. The <strong>ChatPDF Plus</strong> plan costs $9.99 per month (or $69.99 per year when billed annually, equivalent to approximately $5.83/month). Plus unlocks unlimited PDF uploads, unlimited daily questions, up to 2,000 pages per PDF, 32 MB file limits, and multi-file folder querying across grouped documents.</p>`,
    comparison_summary: `<p>Compared to <strong>AskYourPDF</strong>, ChatPDF provides a cleaner, more streamlined user interface with faster instant page parsing, though AskYourPDF offers a broader ecosystem of plugins (including a Zotero extension and ChatGPT plugin). Compared to <strong>Humata</strong>, ChatPDF is generally more affordable for individual students and researchers, whereas Humata provides stronger enterprise role-based permissions and team workspace controls. Compared to generalist chat interfaces like <strong>ChatGPT Plus</strong> with file uploads, ChatPDF's dedicated side-by-side document viewer and clickable page-level citations make source verification considerably faster during academic research.</p>`
  },

  capacities: {
    long_description: `<p>Capacities is a networked note-taking and personal knowledge management (PKM) studio built around an object-oriented data architecture. Instead of treating notes as isolated text files or rigid hierarchical folders, Capacities models knowledge as distinct, interconnected real-world entities—such as people, projects, meetings, books, and ideas.</p><p>Each object type has custom properties, relational tags, and visual views (including graph, wall, list, and gallery layouts). Integrated AI capabilities allow users to summarize notes, query their knowledge base, create smart automations, and generate draft outlines directly within their interconnected digital workspace.</p>`,
    bestFor: [
      'Knowledge workers, researchers, and writers who think in structured, interconnected entities rather than linear file folders',
      'Professionals wanting a unified personal operating system linking daily journals, meeting notes, contacts, and project tasks',
      'Thinkers looking for the visual relational power of Obsidian or Roam without the technical maintenance of local plugins and Markdown formatting'
    ],
    notIdealFor: [
      'Users wanting a simple, barebones scratchpad for quick disposable checklists where object modeling adds unnecessary friction',
      'Enterprises requiring strict local-only file storage under user-controlled encryption keys without cloud synchronization',
      'Teams needing real-time simultaneous collaborative document editing in the style of Google Docs or Figma'
    ],
    primaryUseCases: [
      'Building a personal interconnected digital second brain with linked objects, people, meetings, and topics',
      'Drafting long-form articles, research papers, and books supported by structured citation and resource tracking',
      'Managing daily work logs with seamless backlinking into relevant project dashboards and client dossiers'
    ],
    how_it_works: `<p>Capacities organizes information through a daily calendar note and a library of customizable object types. When capturing thoughts, users either record entries on their daily note or create a specific object (such as a 'Book', 'Meeting', or 'Concept'). Each object type features predefined metadata fields (such as dates, authors, tags, and status) alongside a rich-text canvas.</p><p>As notes are written, users link concepts using bi-directional <code>@mentions</code> and contextual blocks. Capacities automatically builds a dynamic knowledge graph showing how topics intersect. The built-in AI assistant can search across all linked objects, summarize historical notes, surface connections between disparate entries, and draft content using personal knowledge as context.</p>`,
    feature_groups: [
      {
        group: 'Object-Oriented Architecture & PKM',
        items: [
          'Custom object definitions with specialized metadata properties, icons, and visual layouts',
          'Bi-directional page and block linking with interactive interactive graph visualizations',
          'Daily notes calendar hub automatically aggregating daily thoughts, media, and task completions',
          'Flexible database views including grid walls, tables, kanban lists, and visual galleries'
        ]
      },
      {
        group: 'AI Studio & Ecosystem Integrations',
        items: [
          'Integrated conversational AI assistant with context-aware querying across private notes',
          'Automated content capture via WhatsApp, Telegram, email forwarding, and web browser extensions',
          'Native integrations with Readwise and Kindle for continuous book highlight synchronization',
          'Full offline caching with end-to-end cloud synchronization across macOS, Windows, Linux, iOS, and Android'
        ]
      }
    ],
    pros: [
      'Object-based mental model eliminates chaotic folder organization and creates structured, queryable knowledge',
      'Generous free plan includes unlimited spaces, custom object types, and cross-device sync with zero feature paywalls',
      'Clean, distraction-free aesthetic with visual galleries and graph views superior to traditional text-heavy PKM apps',
      'Omni-channel capture via mobile messaging apps (WhatsApp, Telegram) enables instant mobile thought logging'
    ],
    cons: [
      'Initial learning curve requires users to intentionally design object schemas and relationship types',
      'Real-time multi-user team collaboration is limited compared to dedicated enterprise workspaces like Notion',
      'Advanced AI generation and semantic assistant features require an active paid Pro subscription',
      'Total media upload storage on the free plan is capped at 5 GB initial quota (plus 100 MB monthly increment)'
    ],
    pricing_overview: `<p>Capacities operates on a freemium model with a free-forever foundational tier and optional paid tiers for AI and power features.</p><p>The <strong>Basic Plan</strong> ($0) is free forever and includes unlimited spaces, unlimited objects and blocks, unlimited custom object types, cross-platform synchronization (desktop and mobile), offline access, media capture via WhatsApp/Telegram, and 5 GB total media storage. <strong>Capacities Pro</strong> costs $11.99 per month (or $9.99/month billed annually at $119.88/year) and adds the integrated AI assistant, interactive whiteboards, task management actions, smart queries, calendar integrations, version history, Readwise/Kindle sync, and unlimited media uploads. The <strong>Believer Plan</strong> costs $14.99 per month (or $12.49/month billed annually at $149.88/year) and provides early beta access to new features as a community supporter tier. Optional <strong>Pro+ / Believer+</strong> add-ons provide an expanded monthly AI budget and unlock on-demand budget top-ups.</p>`,
    comparison_summary: `<p>Compared to <strong>Notion</strong>, Capacities uses an object-oriented architecture where an entity (e.g., a person or meeting) maintains its structural identity everywhere, whereas Notion relies on database rows nested within hierarchical pages. Compared to <strong>Obsidian</strong>, Capacities provides a polished, out-of-the-box cloud-synced environment without requiring community plugins, sync subscriptions, or Git setups, though Obsidian offers superior local Markdown privacy. Compared to <strong>Roam Research</strong>, Capacities replaces unstructured raw bullet-point outliners with visually rich cards, galleries, and structured object schemas at a lower subscription price.</p>`
  },

  diffit: {
    long_description: `<p>Diffit is an AI-powered instructional differentiation platform built specifically for K-12 educators and instructional coaches. It enables teachers to take any curriculum topic, article, YouTube video, or uploaded document and instantly adapt the content to any specific reading level from 2nd through 12th grade.</p><p>In addition to leveled reading passages, Diffit automatically generates complementary learning resources—including vocabulary lists with kid-friendly definitions, text-dependent comprehension questions, open-ended writing prompts, and interactive graphic organizers. All generated materials export directly into Google Classroom, Google Slides, Google Docs, and printable PDF worksheets.</p>`,
    bestFor: [
      'K-12 classroom teachers needing to adapt grade-level texts for mixed-ability classrooms, ELL students, and IEP accommodations',
      'Instructional coaches and curriculum specialists designing differentiated resource packs aligned to state reading standards',
      'Special education educators requiring simplified vocabulary, scaffolded graphic organizers, and multi-modal reading supports'
    ],
    notIdealFor: [
      'Higher education professors and researchers needing graduate-level technical discourse and peer-reviewed citation modeling',
      'Corporate workplace training departments looking for corporate compliance LMS course authoring',
      'Educators without access to digital classroom tools (Google Workspace or Microsoft 365) seeking solely custom physical textbooks'
    ],
    primaryUseCases: [
      'Differentiating a single reading passage into 3–4 distinct Lexile reading levels for small-group classroom instruction',
      'Transforming educational YouTube videos and news articles into structured classroom comprehension worksheets',
      'Generating standards-aligned vocabulary exercises, summary guides, and multiple-choice quizzes in seconds'
    ],
    how_it_works: `<p>Teachers begin by entering a topic, pasting text, inserting a public URL, or linking a YouTube video, then selecting a target reading level (from Grade 2 to Grade 12+). Diffit's pedagogical language models parse the source material, rewrite the text to match the syntactic complexity and vocabulary appropriate for that grade level, and preserve core curriculum facts.</p><p>Alongside the leveled passage, Diffit generates a complete instructional package including summary bullet points, key vocabulary terms with contextual definitions, text-dependent multiple-choice questions, short-answer prompts, and extension activities. Teachers can edit the content on screen, customize questions, and click export to generate interactive Google Slides, Google Docs, Google Forms quizzes, or printable PDF handouts.</p>`,
    feature_groups: [
      {
        group: 'Instructional Differentiation & Content Generation',
        items: [
          'Reading level adaptation scaling any text, article, or video across 2nd to 12th+ grade Lexile bands',
          'Automated extraction and generation of kid-friendly vocabulary lists with contextual definitions',
          'Standards-aligned comprehension question generation including multiple-choice and open-ended prompts',
          'Multilingual translation allowing classroom texts to be translated into over 40 languages for ELL students'
        ]
      },
      {
        group: 'Classroom Export & Pedagogical Templates',
        items: [
          'One-click export to Google Classroom, Google Slides, Google Docs, Google Forms, and Microsoft Word',
          'Over 60 ready-to-use pedagogical graphic organizers (Frayer models, Venn diagrams, CER frameworks)',
          'Student digital activity view enabling pupils to complete and submit interactive assignments directly',
          'Teacher collaboration tools with shared school libraries and district-wide curriculum alignments'
        ]
      }
    ],
    pros: [
      'Saves teachers hours of weekly preparation time by automatically creating leveled texts and scaffolds',
      'Seamless export into Google Workspace ecosystem enables instant deployment to existing student devices',
      'High pedagogical quality with age-appropriate vocabulary definitions and scaffolded comprehension questions',
      'Free tier is functional and does not limit access to core grade-level differentiation tools'
    ],
    cons: [
      'Full Google Workspace and Microsoft export capabilities require a paid Teacher or School subscription',
      'Free plan limits resource history retention to the most recent 90 days of generated materials',
      'Specialized STEM diagram generation and complex mathematical formulas are less comprehensive than text humanities',
      'Individual teacher annual subscriptions ($149.99/year) may require out-of-pocket spending if schools do not fund licenses'
    ],
    pricing_overview: `<p>Diffit provides a functional free tier alongside individual teacher and school-wide institutional licensing.</p><p>The <strong>Basic Plan</strong> ($0) is free for teachers and includes core reading generation across any grade level, vocabulary lists, comprehension questions, print-to-PDF sharing, and access to content created within the last 90 days. <strong>Diffit for Teachers</strong> costs $14.99 per month or $149.99 per year (equivalent to $12.50/month), unlocking unlimited resource history, direct one-click exports to Google Slides, Docs, Forms, Classroom, and Microsoft formats, interactive student digital activities, and advanced pedagogical templates. <strong>Diffit for Schools & Districts</strong> offers custom annual institutional quotes based on student enrollment, providing school-wide licenses, central administration, LMS integrations, single sign-on (SSO), and dedicated professional development.</p>`,
    comparison_summary: `<p>Compared to <strong>MagicSchool AI</strong>, which offers a broad suite of dozens of administrative prompts (lesson plans, IEP generators, email drafters), Diffit is more deeply specialized in reading passage leveling and multi-level classroom resource formatting. Compared to <strong>Curipod</strong>, which focuses on live interactive polling and gamified slide presentations during class, Diffit focuses on curriculum content adaptation and printable/digital worksheets. Compared to general-purpose chat tools like <strong>ChatGPT</strong>, Diffit generates ready-to-print pedagogical layouts and graphic organizers formatted directly for classroom use without manual prompt engineering.</p>`
  },

  cleanvoice: {
    long_description: `<p>Cleanvoice is an AI-powered audio post-production platform engineered to automatically remove speech artifacts, filler sounds, and unwanted acoustics from podcast recordings, interviews, and voiceovers. It identifies and cleans filler words (like 'um', 'uh', 'like'), lip smacks, heavy mouth breathing, stuttering, and awkward dead silences without altering natural vocal cadence.</p><p>The tool operates through a browser interface, programmatic REST API, and digital audio workstation (DAW) timeline exports. Unlike destructive filters that muffle audio, Cleanvoice generates timeline markers and edit decisions (EDL) allowing audio engineers to inspect, fine-tune, or undo every cut in editors like Audacity, Adobe Premiere, and Reaper.</p>`,
    bestFor: [
      'Podcasters, interviewers, and audio producers spending hours manually cutting filler sounds and mouth clicks from multi-track dialogue',
      'Content creators, YouTubers, and course educators wanting professional vocal polish on home studio recordings',
      'Media agencies and editing studios seeking automated batch pre-editing before applying final creative mastering'
    ],
    notIdealFor: [
      'Heavily degraded audio with severe physical clipping, background hum, or room echo requiring spectral repair (iZotope RX)',
      'Live real-time streaming audio (OBS/Discord) requiring zero-latency hardware noise suppression (Elgato Wavelink / Krisp)',
      'High-volume hobbyists expecting unlimited monthly processing for a low flat fee, as all tiers are metered by audio hours'
    ],
    primaryUseCases: [
      'Automatically detecting and removing \'ums\', \'ahs\', throat clears, and mouth clicks from podcast interviews',
      'Shortening awkward pauses and dead air across conversational recordings to improve pacing',
      'Exporting non-destructive edit decision lists (EDL) and markers directly into Audacity, Premiere Pro, and Reaper'
    ],
    how_it_works: `<p>Users upload single or multi-track audio files (MP3, WAV, M4A, FLAC) to the Cleanvoice dashboard or submit files via the REST API. Acoustic machine learning models scan the speech waveforms to distinguish authentic phonemes from verbal artifacts, such as hesitant fillers ('um', 'er'), stuttered consonants, tongue clicks, and breathing pauses.</p><p>The engine applies non-destructive edits to mute or excise the artifacts while smoothing boundaries to prevent jarring audio pops or artificial cadence. Users can review the processed file in the online visual waveform player, toggle specific cleaning categories on or off, and either download the processed audio or export timeline cut markers for their native DAW.</p>`,
    feature_groups: [
      {
        group: 'Surgical Audio Cleanup & Speech Repair',
        items: [
          'Multilingual filler word detection eliminating \'um\', \'uh\', \'er\', and equivalent regional speech habits',
          'Mouth sound and breath reduction removing salivation clicks, lip smacks, and heavy inhalations',
          'Stutter removal detecting repeated syllables and smoothing voice transitions naturally',
          'Smart silence shortening reducing excessive pauses without creating unnatural robotic pacing'
        ]
      },
      {
        group: 'Workflow & Professional DAW Integration',
        items: [
          'Non-destructive timeline marker exports supporting Audacity, Adobe Premiere Pro, Final Cut Pro, and Reaper',
          'Multi-track audio synchronization and crosstalk removal ensuring clean speaker isolation',
          'Automated transcription and AI chapter summarization generated alongside audio processing',
          'REST API access and webhook support for automated studio publishing pipelines'
        ]
      }
    ],
    pros: [
      'Surgically removes distracting filler words and mouth noises that traditional noise reduction plugins ignore',
      'Non-destructive timeline marker export allows professional audio engineers to review and adjust every cut',
      'Multi-track processing ensures speaker isolation and eliminates overlapping crosstalk bleeding',
      'Offers both flexible pay-as-you-go credit packs and monthly subscriptions with credit rollover'
    ],
    cons: [
      'Processing is metered strictly by audio duration (hours), which can become expensive for daily long-form production',
      'Occasional over-aggressive cuts can clip intentional emotional pauses or natural linguistic emphasis if uninspected',
      'Does not replace comprehensive audio mastering tools for EQ, compression, or spatial stereo widening',
      'Free trial is limited to a one-time 30-minute allocation without a recurring monthly free allowance'
    ],
    pricing_overview: `<p>Cleanvoice uses an audio-hour metered pricing model, offered via flexible pay-as-you-go credit packs or monthly subscriptions with rollover credits.</p><p>A <strong>Free Trial</strong> provides 30 minutes of free audio processing with no credit card required. <strong>Pay-As-You-Go Packs</strong> (valid for 2 years) are available at: 5 hours for $11 ($2.20/hour), 10 hours for $20 ($2.00/hour), and 30 hours for $45 ($1.50/hour). <strong>Monthly Subscriptions</strong> provide discounted rates and allow unused hours to roll over up to 3x your monthly limit: 10 hours/month at $11/month (~$1.10/hour, or $110/year billed annually), 30 hours/month at $28/month (~$0.93/hour, or $300/year billed annually), and 100 hours/month at $90/month (~$0.90/hour, or $900/year billed annually). Custom Enterprise and API tiers for high-volume pipelines (200+ hours/month) start around $0.01 per minute.</p>`,
    comparison_summary: `<p>Compared to <strong>Descript</strong>, which offers a full video/audio text-based document editor, Cleanvoice functions as a focused audio cleaning engine that integrates seamlessly with existing DAWs like Audacity and Premiere without forcing creators to switch editing environments. Compared to <strong>Auphonic</strong>, which excels at automated loudness leveling (LUFS), filtering, and metadata publishing, Cleanvoice provides deeper surgical removal of stutters, filler words, and mouth clicks. Compared to <strong>Adobe Podcast Enhance</strong>, which aggressively regenerates vocal frequencies and can sometimes introduce robotic artifacts, Cleanvoice preserves original vocal timbre while simply excising distracting verbal noises.</p>`
  },

  anythingllm: {
    long_description: `<p>AnythingLLM is an open-source, all-in-one artificial intelligence workspace developed by Mintplex Labs for conversational document retrieval, autonomous agent execution, and large language model orchestration. Designed for deployment as a native desktop application (macOS, Windows, Linux) or a containerized Docker server, it provides an end-to-end retrieval-augmented generation (RAG) platform with complete data privacy.</p><p>The application integrates built-in document parsers, an embedded LanceDB vector database, and modular LLM connectors. Users can connect local model runners (Ollama, LM Studio, LocalAI) or commercial cloud APIs (OpenAI, Anthropic, Gemini, Groq) to chat with private PDF, Word, CSV, and code repositories without leaking sensitive information.</p>`,
    bestFor: [
      'Privacy-focused software developers and technical teams needing local, air-gapped document RAG without third-party cloud leaks',
      'Organizations wanting a self-hosted, multi-user AI chat hub with custom workspaces, user permissions, and document segmentation',
      'Power users wanting to orchestrate local open-source LLMs (via Ollama or LM Studio) through a polished desktop graphical interface'
    ],
    notIdealFor: [
      'Non-technical consumers wanting a completely hosted, zero-configuration cloud service with bundled model tokens',
      'Hardware setups with minimal RAM (under 8 GB) attempting to run heavy local vectorization and 14B+ parameter models simultaneously',
      'Teams requiring turnkey SOC2-certified enterprise compliance without managing their own server infrastructure or paid cloud hosting'
    ],
    primaryUseCases: [
      'Querying internal company documentation, codebases, and financial spreadsheets through private semantic RAG',
      'Providing a centralized self-hosted AI chat interface with role-based workspace permissions for business teams',
      'Deploying autonomous web-scraping and custom agent workflows connected to local and cloud LLMs'
    ],
    how_it_works: `<p>AnythingLLM runs locally or as a Docker container, managing the entire RAG pipeline internally. When a user uploads documents (such as PDFs, Markdown files, office documents, or web URLs) into a designated 'Workspace', the platform's built-in parsing engine extracts text, chunks it into context windows, and generates vector embeddings using either a local embedding model or an external API.</p><p>The vectors are stored in an embedded vector database (such as LanceDB or Chroma). When a user chats with the workspace, AnythingLLM retrieves the top matching document chunks, combines them with the system prompt, and routes the query to the user's selected LLM. Responses are streamed back into the chat window with interactive source citations. Users can switch between conversation modes ('Chat' for general answers or 'Query' for strict document grounding).</p>`,
    feature_groups: [
      {
        group: 'Local RAG & Workspace Isolation',
        items: [
          'Isolated multi-workspace environment allowing distinct documents, system prompts, and vector thresholds per project',
          'Built-in document ingestion engine supporting PDF, TXT, DOCX, CSV, Markdown, and live website URLs',
          'Embedded zero-configuration vector storage powered by LanceDB, with support for Pinecone, Chroma, and Weaviate',
          'Dual interaction modes: conversational \'Chat\' mode and strict hallucination-resistant \'Query\' mode'
        ]
      },
      {
        group: 'Model Orchestration & Multi-User Governance',
        items: [
          'Universal LLM provider support connecting Ollama, LM Studio, OpenAI, Anthropic, Gemini, Groq, and custom endpoints',
          'Autonomous agent capabilities allowing models to scrape web pages, execute SQL queries, and trigger custom webhooks',
          'Multi-user administration on self-hosted Docker instances with role-based access control (Admin, Manager, User)',
          'Full developer REST API and programmatic endpoints for embedding chat widgets into internal portals'
        ]
      }
    ],
    pros: [
      '100% free and open-source desktop software (MIT license) with complete local execution and privacy',
      'Eliminates the complexity of configuring vector databases, chunking strategies, and embedding models separately',
      'Universal compatibility allows seamless switching between offline local models (Ollama) and cloud APIs (OpenAI/Anthropic)',
      'Multi-tenant Docker edition provides enterprise-grade team permissions and workspace separation for self-hosters'
    ],
    cons: [
      'Does not bundle LLM generation tokens: users must provide their own hardware or external API keys',
      'Hardware performance on local models is strictly bounded by user CPU, GPU VRAM, and system RAM',
      'Docker server deployment and SSL configuration require intermediate DevOps and networking knowledge',
      'Official managed cloud hosting requires a paid subscription ($50 to $99/month) for teams avoiding self-hosting'
    ],
    pricing_overview: `<p>AnythingLLM is fundamentally free and open-source software, with optional managed cloud hosting provided by Mintplex Labs for teams wanting hassle-free cloud deployments.</p><p>The <strong>AnythingLLM Desktop</strong> application (macOS, Windows, Linux) is 100% free forever under the MIT license, including all RAG, document parsing, agent, and workspace capabilities. The <strong>Self-Hosted Docker</strong> edition is also completely free for self-managed server deployments with multi-user governance (users bring their own API keys or local models). For organizations that prefer managed cloud infrastructure, <strong>AnythingLLM Cloud</strong> offers managed AWS hosting: <strong>Basic</strong> at $50/month (private instance on a custom subdomain, isolated database, automated updates), <strong>Pro</strong> at $99/month (higher performance resources and priority 72-hour SLA), and <strong>Enterprise</strong> (custom quote for on-premise deployments, custom SSO, RBAC, and dedicated support). Cloud plans cover hosting infrastructure; external LLM token fees remain pay-as-you-go via user API keys.</p>`,
    comparison_summary: `<p>Compared to <strong>Ollama</strong>, which is a headless command-line model runner and inference server, AnythingLLM provides a complete graphical user interface with built-in RAG document parsing, vector indexing, and multi-workspace management (and can use Ollama as its local backend). Compared to <strong>LM Studio</strong>, which focuses primarily on downloading and testing raw LLM weights locally, AnythingLLM is purpose-built around document knowledge bases, team collaboration, and agent tool execution. Compared to <strong>Open WebUI</strong>, AnythingLLM provides an easier native desktop installation without requiring Docker or Python setup for single-user workstations.</p>`
  },

  'flair-ai': {
    long_description: `<p>Flair AI is an AI-powered visual design and commercial product photography platform tailored for e-commerce brands, marketing agencies, and digital sellers. Built around a spatial digital canvas, the software allows creators to place raw product photographs onto realistically rendered 3D scenes with accurate lighting, natural shadows, and thematic props.</p><p>Instead of hiring commercial photography studios and building physical sets, e-commerce teams can stage catalog imagery in seconds. The platform includes generative scene expansion, prompt-assisted styling, camera angle controls, background removal, and high-resolution upscaling for online storefronts and social ad campaigns.</p>`,
    bestFor: [
      'Direct-to-consumer (DTC) brands and e-commerce entrepreneurs creating professional product catalog listings on Shopify and Amazon',
      'Digital marketing agencies generating high-converting social media ad creatives and promotional banners at scale',
      'Product designers and brand directors testing seasonal visual themes and packaging concepts before physical photoshoots'
    ],
    notIdealFor: [
      'General digital illustration and concept art, where broad generative platforms like Midjourney or Recraft offer wider artistic range',
      'Products requiring complex transparent glass reflections or intricate internal refractions that challenge diffusion lighting engines',
      'High-volume enterprise production requiring millions of programmatic batch renders without human canvas composition'
    ],
    primaryUseCases: [
      'Transforming plain white-background product shots into lifestyle scenes with realistic surfaces and props',
      'Generating seasonal advertising creative (e.g., holiday or summer themes) for social media ad testing',
      'Creating cohesive, visually styled product catalog imagery with consistent brand lighting and camera angles'
    ],
    how_it_works: `<p>Users upload a photograph of their physical product, and Flair AI automatically isolates the product packaging by removing the background. The user places the cutout onto an interactive design canvas alongside optional 3D reference props (such as pedestals, foliage, or stones) and selects an environment theme or enters a custom prompt.</p><p>Flair AI's diffusion models synthesize the background environment while preserving the integrity of the original product packaging, labels, and logos. The engine casts realistic shadows and reflections onto the surrounding surfaces based on simulated light sources. Users can tweak the composition, regenerate specific scene elements using inpainting, and upscale the final render to 4K resolution for commercial use.</p>`,
    feature_groups: [
      {
        group: 'Product Staging & Generative Scenes',
        items: [
          'Interactive drag-and-drop canvas allowing precise spatial positioning of products and accessory props',
          'Proprietary product preservation algorithms ensuring brand logos, text, and packaging geometry remain intact',
          'Automated realistic lighting and shadow synthesis matching the product to surrounding environmental conditions',
          'Curated style and scene template library designed specifically for cosmetics, beverages, and packaged goods'
        ]
      },
      {
        group: 'Commercial Studio & Ad Tools',
        items: [
          'High-resolution image upscaling and enhancement optimized for Shopify, Amazon, and print collateral',
          'Inpainting, generative fill, and canvas expansion allowing iterative localized adjustments',
          'Generative short-form product video creation and animated product reels from static imagery',
          'Commercial licensing included on paid plans permitting unrestricted advertising and packaging deployment'
        ]
      }
    ],
    pros: [
      'Significantly reduces physical photoshoot costs and turnaround times for e-commerce product catalogs',
      'Preserves original product labels and packaging details without generative text distortion',
      'Spatial canvas controls make positioning props, camera angles, and lighting intuitive for non-designers',
      'Prebuilt scene templates allow fast generation for popular consumer categories like skincare, supplements, and drinks'
    ],
    cons: [
      'Unused monthly generation credits do not roll over to subsequent billing cycles',
      'Highly reflective or transparent glass bottles can occasionally produce inconsistent refraction artifacts',
      'Free tier is limited to introductory trial generations and does not grant commercial usage rights',
      'Complex multi-product group shots with varying focal depths require careful manual canvas arrangement'
    ],
    pricing_overview: `<p>Flair AI operates on a freemium model with credit-based subscription tiers tailored for e-commerce sellers and marketing agencies.</p><p>The <strong>Free Tier</strong> ($0) provides introductory trial credits (~5 image generations) to evaluate the design canvas and tools (non-commercial use). <strong>Pro</strong> costs $10 per month (or $8/month billed annually at $96/year) and includes 2 video generations, image upscaling, image variations, faster rendering priority, and full commercial usage rights. <strong>Pro+</strong> costs $35 per month (or $26/month billed annually at $312/year), offering expanded monthly image credits, up to 8 standard or 2 fast custom trained models, and priority processing. <strong>Scale</strong> starts at $55 per month (or $38/month billed annually at $456/year) for 150 images and 5 videos, scaling across 5 tiers up to $199/month ($138/month billed annually) for 540 images and 15 videos alongside team administration. Custom <strong>Enterprise</strong> plans provide SAML-based SSO, unlimited API access, and dedicated support. Unused generation credits do not roll over across billing cycles.</p>`,
    comparison_summary: `<p>Compared to <strong>Midjourney</strong>, Flair AI is purpose-built for commercial product staging and guarantees the preservation of real product labels and packaging geometry, whereas Midjourney tends to invent or distort product text and shapes. Compared to <strong>Photoroom</strong>, which excels at rapid mobile background removal and simple marketplace cutouts, Flair AI provides a more sophisticated 3D spatial studio canvas for detailed lifestyle scene construction. Compared to <strong>Pebblely</strong>, Flair AI offers greater granular control over prop placement, lighting direction, and camera perspective on an open digital canvas.</p>`
  }
};

function main() {
  console.log(`[START] Applying Batch 2 enrichments to 7 priority AI tools...`);

  // 1. Update data/tools.json
  if (!fs.existsSync(TOOLS_JSON_PATH)) {
    console.error(`[ERROR] Tools JSON not found at ${TOOLS_JSON_PATH}`);
    process.exit(1);
  }
  const tools = JSON.parse(fs.readFileSync(TOOLS_JSON_PATH, 'utf8'));
  const targetIds = Object.keys(ENRICHMENTS);

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
    tool.evidenceReviewedAt = '2026-11-03';
    console.log(`  ✓ Updated ${id} in data/tools.json`);
  }
  fs.writeFileSync(TOOLS_JSON_PATH, JSON.stringify(tools, null, 2), 'utf8');
  console.log(`[SUCCESS] data/tools.json updated with 7 enriched Batch 2 profiles.`);

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
      'browse-ai': 'Official product documentation, workflow integrations, browser extension capabilities, and credit-based pricing reviewed November 2026. Freemium model confirmed with Free Plan (50 credits/mo, 2 sites). Paid plans confirmed at Personal ($48/mo monthly / $19/mo annual, 2,000 credits/mo), Professional ($87/mo monthly / $69/mo annual, 5,000 credits/mo), and Custom Enterprise. 1 credit extracts 10 rows on standard sites with higher multipliers on anti-bot domains.',
      chatpdf: 'Official application interface, RAG retrieval engine, page citation workflow, and pricing documentation reviewed November 2026. Freemium model confirmed with Free tier (2 PDFs/day, 120 pages/file, 10MB limit, 50 questions/day). ChatPDF Plus confirmed at $9.99/mo (or $69.99/yr annual) providing unlimited documents, unlimited questions, 2,000 pages per PDF, 32MB file limits, and multi-file folder querying.',
      capacities: 'Official documentation, object schema guides, cross-device sync specifications, and pricing reviewed November 2026. Freemium model confirmed with Basic Free plan ($0 forever, unlimited spaces, objects, blocks, and mobile/desktop sync with 5GB media storage). Capacities Pro confirmed at $11.99/mo monthly or $9.99/mo annual ($119.88/yr) with integrated AI assistant, whiteboards, task actions, and smart queries. Believer supporter tier confirmed at $14.99/mo monthly or $12.49/mo annual ($149.88/yr). Pro+/Believer+ add-on confirmed for larger monthly AI budgets.',
      diffit: 'Official instructional platform, Lexile leveling engine, Google/Microsoft export integrations, and pricing reviewed November 2026. Freemium model confirmed with Basic Plan ($0 forever for teachers with core reading leveling, vocab, questions, and 90-day history). Diffit for Teachers confirmed at $14.99/mo ($149.99/yr annual) with unlimited history, direct Google Workspace/Microsoft exports, and interactive student digital activities. School/district licenses priced on institutional enrollment.',
      cleanvoice: 'Official audio processing specifications, digital audio workstation export integrations (Audacity, Premiere, Reaper), and pricing documentation reviewed November 2026. Paid service with free 30-minute processing trial (no credit card required). Pay-as-you-go credit packs confirmed at 5 hours ($11), 10 hours ($20), and 30 hours ($45) valid for 2 years. Subscriptions confirmed at 10 hrs ($11/mo monthly / $110/yr annual), 30 hrs ($28/mo monthly / $300/yr annual), and 100 hrs ($90/mo monthly / $900/yr annual) with rollover.',
      anythingllm: 'Official GitHub repository, desktop releases, Docker documentation, and cloud pricing reviewed November 2026. Desktop application (macOS, Windows, Linux) and Docker container are 100% free and open source under MIT license with embedded LanceDB vector database and BYOK / local model support (Ollama, LM Studio). AnythingLLM Cloud confirmed as optional managed hosting by Mintplex Labs at Basic ($50/mo), Pro ($99/mo), and custom Enterprise.',
      'flair-ai': 'Official product photography canvas, 3D prop staging tools, lighting synthesis models, and pricing documentation reviewed November 2026. Freemium model confirmed with free introductory trial quota (~5 images) for non-commercial evaluation. Paid commercial subscriptions confirmed at Pro ($10/mo monthly / $8/mo annual at $96/yr with commercial license and 2 video generations), Pro+ ($35/mo monthly / $26/mo annual at $312/yr with custom models), and Scale ($55/mo monthly / $38/mo annual at $456/yr for 150 images/5 videos, scaling to $199/mo for 540 images). Unused credits do not roll over.'
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
