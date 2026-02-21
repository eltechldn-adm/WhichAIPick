// Phase 8.6 — Enrichment Batch 4 (tools 30–40)
import { readFileSync, writeFileSync } from 'fs';
const PATH = './data/tools.json';
const tools = JSON.parse(readFileSync(PATH, 'utf8'));

const enrichment = {

    'copyai': {
        long_description: `<p>Copy.ai is an AI writing platform focused on marketing and sales content generation. It provides a range of tools for generating ad copy, sales emails, product descriptions, blog posts, and social media content using large language models.</p><p>Founded in 2020, Copy.ai was one of the early entrants to the AI copywriting tool market. It has since expanded toward multi-step workflow automation for marketing teams, introducing a workflow builder for automated content pipelines at scale.</p><p>Copy.ai competes primarily with Jasper AI in the marketing-focused writing tool space, though both also compete with general-purpose AI assistants like ChatGPT as those tools have improved on marketing-related tasks.</p>`,
        how_it_works: `<p>Users select from a library of content types, enter relevant context such as product name and audience, and generate multiple output options simultaneously. The Chat interface allows conversational content generation. Workflows allow users to chain generation steps into automated content pipelines that process inputs and produce structured outputs at scale. Team features allow shared access to brand voices and content templates.</p>`,
        workflows: [
            { title: 'Sales Email Sequence Generation', description: 'Sales teams use Copy.ai to generate multi-step cold email sequences, producing initial contact messages, follow-ups, and closing prompts from prospect information inputs.' },
            { title: 'Ad Copy Variant Testing', description: 'Marketing teams generate multiple ad headline and body variants for A/B testing across platforms, rapidly expanding creative options without proportional writing time.' },
            { title: 'Product Description Scaling', description: 'E-commerce teams automate product description generation using Copy.ai workflows, processing product attributes in bulk to produce formatted descriptions at scale.' },
            { title: 'Blog Content Outlines', description: 'Content marketers use Copy.ai to generate content outlines and first draft sections from keyword briefs, reducing time-to-draft for regular publishing.' }
        ],
        feature_groups: [
            { group: 'Core Capabilities', items: ['Marketing copy templates (90+ types)', 'AI chat for conversational generation', 'Brand voice configuration', 'Multi-language support', 'Team project collaboration'] },
            { group: 'Advanced Capabilities', items: ['Workflow builder for automated content pipelines', 'CRM and data source integrations', 'Bulk generation via workflows', 'Infobase for brand knowledge', 'API access'] }
        ],
        best_for: ['Marketing teams producing regular content at scale', 'Sales development reps writing outreach sequences', 'E-commerce businesses with large catalogues', 'Agencies managing copy for multiple clients'],
        pros: ['Broad template library for marketing formats', 'Workflow automation for bulk content generation', 'Generates multiple variants simultaneously', 'Competitive pricing relative to Jasper'],
        cons: ['Output requires editing before publishing', 'Less strong on SEO features vs Jasper+Surfer', 'Workflow builder has a learning curve', 'General-purpose AI tools increasingly cover the same use cases'],
        pricing_overview: `<p>Copy.ai offers a free plan with limited monthly word generation. Paid plans include unlimited generation, workflow access, more team seats, and priority support. Enterprise plans offer custom pricing and integration capability.</p>`,
        comparison_summary: `<p>Copy.ai's closest competitor is Jasper AI. Jasper tends to target enterprise clients at a higher price with stronger brand voice features. Copy.ai competes on accessibility and workflow automation depth. Both are increasingly challenged by general-purpose assistants like ChatGPT handling marketing copy tasks without a dedicated subscription.</p>`
    },

    'pika': {
        long_description: `<p>Pika is an AI video generation platform that allows users to create short video clips from text prompts, images, or existing videos. It launched in late 2023 and quickly gained a significant user base due to its accessible interface and quality output relative to other tools at the time.</p><p>Pika is designed for content creators, social media users, and casual video producers who want to generate short animated or live-action style videos without filmmaking experience. It is simpler and more consumer-friendly than platforms like Runway, which targets professional post-production workflows.</p><p>Pika has continued to develop new features including video editing, lip sync, and longer clip generation, positioning itself as a broad consumer video AI tool.</p>`,
        how_it_works: `<p>Users enter a text prompt describing the desired video or upload an image or video clip as a reference. Pika generates a short video output (typically a few seconds). Users can adjust parameters like motion intensity, aspect ratio, and camera movement. Generated clips can be extended, modified with additional prompts, or downloaded. The interface is fully web-based with no local installation required.</p>`,
        workflows: [
            { title: 'Social Media Video Content', description: 'Creators generate short looping video clips for social media posts and reels from still images or text descriptions.' },
            { title: 'Image Animation', description: 'Designers animate still product images, illustrations, or artwork into motion clips for use in presentations or digital campaigns.' },
            { title: 'Video Concept Demonstration', description: 'Marketers and directors generate rough visual representations of video concepts for internal review before committing to production.' },
            { title: 'Experimental Creative Content', description: 'Artists use Pika to explore generative video aesthetics and create short-form surreal or stylised video content.' }
        ],
        feature_groups: [
            { group: 'Core Capabilities', items: ['Text-to-video generation', 'Image-to-video animation', 'Video-to-video transformation', 'Aspect ratio and motion controls', 'Clip extension'] },
            { group: 'Advanced Capabilities', items: ['Lip sync feature', 'Precise structure and style controls', 'Long video output (extended plans)', 'API access', 'Sound effects generation'] }
        ],
        best_for: ['Social media creators needing video content', 'Marketers generating video concepts quickly', 'Designers animating static assets', 'Content creators exploring AI-generated video', 'Casual creators without video editing experience'],
        pros: ['Accessible interface for non-technical users', 'Good output quality for short-form content', 'Rapid generation from simple prompts', 'Regular feature additions', 'Free tier available'],
        cons: ['Clip length is limited', 'Output can be inconsistent for complex scenes', 'Less production-tool depth than Runway', 'Fine-grained creative control is limited', 'Credits consumed per generation'],
        pricing_overview: `<p>Pika offers a free tier with limited monthly video generation credits. Paid plans increase monthly credit allocation, video length options, and access to higher quality generation. Subscription billing is monthly or annual, with credits consumed per generated clip.</p>`,
        comparison_summary: `<p>Pika competes most directly with Runway and Luma AI Dream Machine. Runway is more suited for professional production workflows with a broader editing toolkit. Luma focuses on physical realism. Pika is the most consumer-friendly option in the category, prioritising accessibility over production depth. Sora (OpenAI) is the aspirational quality benchmark but remains limited in availability.</p>`
    },

    'otterai': {
        long_description: `<p>Otter.ai is an AI-powered meeting transcription and note-taking tool that records, transcribes, and summarises spoken conversations in real time. It is designed for professionals who participate in frequent meetings, interviews, or lectures and need an accurate record of what was said without manual note-taking.</p><p>Otter integrates with Zoom, Google Meet, and Microsoft Teams, and can automatically join scheduled calls to capture transcripts. It also provides an AI meeting assistant that answers questions about past meetings and generates summaries.</p><p>Otter is widely used in enterprise and education contexts, where meeting documentation and searchable archives of spoken content provide significant value.</p>`,
        how_it_works: `<p>Users connect Otter to their calendar and meeting platforms. When a meeting starts, the Otter assistant automatically joins and begins transcribing in real time, attributing speech to identified speakers. After the meeting, Otter generates a summary, action items, and a searchable transcript. Users can highlight sections, add comments, and share the transcript with collaborators. The Otter AI chat allows users to ask questions about the meeting content.</p>`,
        workflows: [
            { title: 'Automated Meeting Documentation', description: 'Teams configure Otter to join all scheduled calls and produce automatic transcripts and summaries, removing the need for a manual note-taker.' },
            { title: 'Post-Meeting Action Item Extraction', description: 'Managers review Otter summaries after meetings to quickly identify and assign action items without re-listening to recordings.' },
            { title: 'Interview Transcription', description: 'Journalists, UX researchers, and HR professionals use Otter to transcribe interviews, enabling searchable reference without full re-read.' },
            { title: 'Lecture and Class Notes', description: 'Students use Otter to automatically transcribe lectures for later review, reducing the cognitive load of simultaneous listening and note-taking.' }
        ],
        feature_groups: [
            { group: 'Core Capabilities', items: ['Real-time meeting transcription', 'Speaker identification', 'AI-generated meeting summary', 'Action item extraction', 'Transcript search and highlighting'] },
            { group: 'Advanced Capabilities', items: ['Auto-joining of calendar-linked meetings', 'Zoom, Meet, Teams integration', 'AI chat about meeting content', 'Team transcript sharing', 'Custom vocabulary'] }
        ],
        best_for: ['Professionals with heavy meeting schedules', 'Sales and customer success teams documenting calls', 'UX researchers and interviewers', 'Journalists and content creators', 'Students attending lectures'],
        pros: ['Real-time transcription with speaker labels', 'Automatic meeting join removes setup friction', 'Searchable transcript archive', 'AI summary and action item extraction', 'Strong platform integrations'],
        cons: ['Transcription accuracy varies with accents and audio quality', 'Auto-joining can be intrusive if not configured carefully', 'Privacy considerations for automatically transcribed conversations', 'Free tier has monthly transcription limits', 'AI summary quality varies with meeting structure'],
        pricing_overview: `<p>Otter.ai offers a free plan with limited monthly transcription minutes and basic features. Pro and Business plans increase monthly minute allowances, add features like custom vocabulary, team workspaces, and advanced integrations. Enterprise plans provide SSO, audit logs, and higher usage limits.</p>`,
        comparison_summary: `<p>Otter.ai competes primarily with Fireflies.ai, Fathom, and tl;dv in the AI meeting transcription space. Fireflies.ai offers similar capabilities with stronger CRM integration. Fathom is free for individual use and noted for its ease of setup. tl;dv focuses on video meeting clips for sales and research teams. Otter differentiates on its transcript accuracy, search functionality, and breadth of platform integrations.</p>`
    },

    'gamma': {
        long_description: `<p>Gamma is an AI-powered presentation and document creation tool that generates structured slides, documents, and web pages from a text prompt or outline. It is designed to reduce the time spent on formatting and design in traditional presentation tools by letting AI handle layout, while users focus on content.</p><p>Unlike PowerPoint or Google Slides, Gamma generates presentations as web-native documents with responsive design, smooth transitions, and embeddable media. The output is viewed in a browser or presented in fullscreen mode, rather than as a traditional downloaded file.</p><p>Gamma targets knowledge workers, educators, and marketers who need to produce polished presentations quickly without a design background or significant formatting time investment.</p>`,
        how_it_works: `<p>Users type a topic or paste an outline into the Gamma prompt interface. The AI generates a complete presentation with suggested content, formatting, and imagery across multiple slides or sections. Users can then edit individual slides in a block-based editor, swap images, adjust layouts, and change the visual theme. Finished presentations are shared via a URL link and can be embedded or exported as PDFs.</p>`,
        workflows: [
            { title: 'Meeting Deck from Notes', description: 'Professionals paste meeting notes or bullet points into Gamma and generate a formatted presentation for stakeholder review within minutes.' },
            { title: 'Educational Lesson Slides', description: 'Educators input lesson topics and objectives, then use Gamma to produce structured slide decks with AI-generated content and imagery.' },
            { title: 'Sales Proposal Documents', description: 'Sales teams describe a client situation and Gamma generates a proposal-format document that serves as a starting point for a customised pitch.' },
            { title: 'Internal Knowledge Sharing', description: 'Teams use Gamma to document processes and share knowledge in a polished, web-native format that is more engaging than a plain document.' }
        ],
        feature_groups: [
            { group: 'Core Capabilities', items: ['AI presentation generation from prompt or outline', 'Block-based editing interface', 'Smart template and theme selection', 'AI-selected imagery', 'Share via URL'] },
            { group: 'Advanced Capabilities', items: ['AI slide regeneration and editing', 'PDF and PowerPoint export', 'Analytics on presentation views', 'Team collaboration', 'Custom branding and fonts'] }
        ],
        best_for: ['Knowledge workers needing fast presentation production', 'Educators creating structured lesson materials', 'Sales and marketing teams building proposal decks', 'Startup founders creating pitch decks', 'Content creators producing visual explainers'],
        pros: ['Dramatically reduces time to produce a formatted presentation', 'Web-native output is accessible without file downloads', 'Strong default designs with minimal formatting effort', 'AI regeneration allows quick iteration', 'URL sharing is convenient for collaboration'],
        cons: ['Less control over fine-grained design than PowerPoint or Keynote', 'Web-native format may not suit all business contexts', 'PDF export does not fully replicate interactive web view', 'AI content still requires review and editing', 'Advanced features and custom branding require paid plan'],
        pricing_overview: `<p>Gamma offers a free plan with a limited number of AI generation credits for new presentations. Paid plans provide unlimited AI generations, custom domain embedding, PDF/PPTX export, analytics, and team collaboration features. Pricing is per seat with monthly or annual billing.</p>`,
        comparison_summary: `<p>Gamma competes with Beautiful.ai, Tome, and to a lesser degree with Canva and traditional tools like PowerPoint. Beautiful.ai offers AI-assisted design within a more traditional slide structure. Tome focuses on narrative documents with AI generation. Gamma's differentiation is speed of generation and its web-native, shareable-by-URL output format.</p>`
    },

    'codeium': {
        long_description: `<p>Codeium is an AI coding assistant offering code completion, AI chat, and codebase search features across a wide range of programming languages and editors. It is developed by Exafunction and positioned as a free or low-cost alternative to GitHub Copilot, particularly for individual developers and smaller teams.</p><p>Codeium integrates with over 70 IDEs and editors including VS Code, JetBrains, Vim, and Emacs. A notable differentiator is the availability of a free individual plan that provides production-quality AI code completions without usage limits, making it accessible to developers who do not want to pay for a coding AI subscription.</p><p>For enterprise use, Codeium offers on-premise deployment options, which addresses data privacy requirements that cloud-hosted tools cannot satisfy for regulated industries.</p>`,
        how_it_works: `<p>Codeium operates as an editor extension or plugin. As a developer types, Codeium generates inline code completions based on the surrounding code context and the developer's patterns. The chat interface allows conversational coding assistance, code explanation, and refactoring requests. Search allows fast navigation of functions and patterns across the codebase. Enterprise deployments run the model on the company's own infrastructure rather than sending code to external servers.</p>`,
        workflows: [
            { title: 'Code Completion During Development', description: 'Developers benefit from Codeium\'s inline suggestions reducing keystrokes and accelerating routine implementation across any supported language.' },
            { title: 'Code Explanation for Onboarding', description: 'New team members use Codeium chat to understand unfamiliar code patterns, function behaviour, and variable usage within their IDE.' },
            { title: 'Refactoring Assistance', description: 'Engineers use Codeium\'s chat to request refactored versions of selected code with reasoning, improving clarity without manual rewriting.' },
            { title: 'On-Premise Deployment for Privacy-Sensitive Teams', description: 'Enterprise engineering teams in regulated industries deploy Codeium on-premise, gaining AI coding assistance without transmitting code externally.' }
        ],
        feature_groups: [
            { group: 'Core Capabilities', items: ['AI inline code completion', '70+ IDE and editor support', '70+ programming languages', 'AI chat for coding questions', 'Codebase search'] },
            { group: 'Advanced Capabilities', items: ['On-premise enterprise deployment', 'Team management and analytics (Enterprise)', 'Custom model fine-tuning (Enterprise)', 'Single sign-on integration', 'Audit logging'] }
        ],
        best_for: ['Individual developers seeking a free Copilot alternative', 'Teams in privacy-sensitive industries needing on-premise AI', 'Developers using editors or languages with limited Copilot support', 'Development teams evaluating AI coding tools at low risk'],
        pros: ['Generous free individual plan', 'Broad IDE and language support', 'On-premise deployment option for enterprises', 'Strong code completion quality', 'Low adoption friction for teams'],
        cons: ['Less polished UX than Cursor or Copilot in VS Code', 'Codebase indexing depth is less comprehensive than Cursor', 'Enterprise on-premise setup requires IT resources', 'Community and plugin ecosystem smaller than GitHub Copilot', 'Chat feature less capable than Copilot Chat in complex scenarios'],
        pricing_overview: `<p>Codeium is free for individual developers with no per-month limits on code completions. Teams and Enterprise plans introduce seat-based pricing with advanced management features, on-premise deployment options, and custom model fine-tuning. Enterprise pricing is available on request.</p>`,
        comparison_summary: `<p>Codeium's primary positioning is as a free or lower-cost alternative to GitHub Copilot for individual developers. Copilot has deeper GitHub integration and a more mature ecosystem. Tabnine also competes on privacy with local model options. Cursor offers a more deeply integrated AI editing experience as a standalone editor. Codeium differentiates most on price accessibility and breadth of editor support.</p>`
    },

    'tabnine': {
        long_description: `<p>Tabnine is an AI coding assistant known for its strong privacy-first positioning, offering both cloud-hosted and fully local AI code completion models. It was one of the earliest AI code completion tools in the market, predating GitHub Copilot's release.</p><p>Tabnine integrates with popular IDEs including VS Code, JetBrains, and others, providing inline code completions and an AI chat assistant. Its enterprise offering emphasises that customer code is never used in model training, and local model options allow completions without any code leaving the developer's machine.</p><p>Tabnine is particularly well-suited for enterprise engineering teams with strict data governance requirements, regulated industry environments, or organisations that have concerns about training data usage and intellectual property.</p>`,
        how_it_works: `<p>Tabnine functions as an IDE extension that generates inline code completions as developers type. It can run on Tabnine's cloud infrastructure or locally on the developer's machine using a smaller local model. Chat features enable conversational coding assistance within the IDE. Enterprise users can train Tabnine on their organisation's own codebase to improve the relevance of completions for internal patterns and libraries.</p>`,
        workflows: [
            { title: 'Code Completion with Local Model', description: 'Privacy-conscious developers run Tabnine\'s local model to receive AI code completions entirely on their machine, with no code sent to external servers.' },
            { title: 'Organisation-Specific Code Training', description: 'Enterprise teams train Tabnine on their proprietary codebase so completions reflect internal architecture patterns, naming conventions, and library usage.' },
            { title: 'Cross-Language Development Assistance', description: 'Polyglot developers use Tabnine\'s broad language support to maintain AI code assistance across different parts of a codebase in different languages.' },
            { title: 'Regulated Industry Deployment', description: 'Engineering teams in finance, healthcare, and government use Tabnine\'s isolation guarantees to adopt AI coding assistance within data compliance requirements.' }
        ],
        feature_groups: [
            { group: 'Core Capabilities', items: ['AI inline code completion', 'Cloud and local model options', 'IDE integration (VS Code, JetBrains, others)', 'Multi-language support', 'AI chat assistant'] },
            { group: 'Advanced Capabilities', items: ['Custom model training on private codebase', 'Zero data retention guarantee (Enterprise)', 'On-premise or VPC deployment', 'Admin and policy controls', 'Compliance certifications'] }
        ],
        best_for: ['Enterprise engineering teams with data privacy requirements', 'Developers in regulated industries (finance, healthcare, government)', 'Organisations concerned about training data and IP', 'Teams wanting organisation-specific code completions', 'Developers preferring a local-first AI model option'],
        pros: ['Industry-leading privacy and data control options', 'Local model option for air-gapped or locked-down environments', 'Custom training on proprietary codebase', 'Long track record in AI code completion market', 'Clear compliance and security documentation'],
        cons: ['Local model is less capable than cloud model or premium alternatives', 'Base cloud completions are comparable to but not beyond Copilot', 'Enterprise features require higher-tier investment', 'Less innovative UX evolution compared to Cursor', 'Smaller community discussion and prompt-sharing ecosystem'],
        pricing_overview: `<p>Tabnine offers a free plan with basic code completion using a smaller model. Pro plans provide access to the full cloud model and chat features. Enterprise plans include custom model training, on-premise deployment, zero data retention guarantees, and compliance documentation. Pricing is per seat with volume discounts available.</p>`,
        comparison_summary: `<p>Tabnine and Codeium are the primary privacy-focused alternatives to GitHub Copilot in the AI code completion space. Tabnine is more established and has stronger enterprise compliance documentation. Codeium has a more generous free tier and broader editor support. For maximum AI coding capability regardless of privacy, Cursor and Copilot remain more capable. Tabnine's clearest competitive position is in compliance-sensitive enterprise environments.</p>`
    },

    'surfer-seo': {
        long_description: `<p>Surfer SEO is an AI-powered content optimisation platform designed to help writers and SEO professionals create content that ranks well in search engine results. It analyses top-ranking pages for a target keyword and generates data-driven guidelines for content structure, word count, keyword usage, and topic coverage.</p><p>The platform combines an AI content editor with SERP analysis, providing real-time SEO scoring as users write. It is used by content agencies, in-house SEO teams, and writers who produce content with organic search performance as a primary objective.</p><p>Surfer SEO integrates with Jasper AI and other writing tools, and can generate full article drafts informed by its SEO analysis through its own AI writing feature.</p>`,
        how_it_works: `<p>Users enter a target keyword and Surfer SERP Analyser pulls data from currently ranking pages, identifying patterns in word count, headings, keyword density, and related terms. The Content Editor provides a real-time document with a score (0–100) that updates as the user writes, indicating alignment with the optimisation targets. AI-generated outlines and full article drafts can be produced from within the editor. Completed content is exported or published via CMS integrations.</p>`,
        workflows: [
            { title: 'SEO Content Brief Generation', description: 'Content managers use Surfer to generate data-driven briefs for writers, specifying target word count, headings, keyword usage, and related topics based on SERP analysis.' },
            { title: 'Real-Time Content Optimisation', description: 'Writers draft articles within the Surfer editor and monitor the content score in real time, adjusting keyword usage and coverage to improve projected ranking potential.' },
            { title: 'Competitor Content Analysis', description: 'SEO teams use Surfer\'s SERP analysis to understand what competing pages cover and identify content gaps before writing or updating their own content.' },
            { title: 'Content Audit and Refresh', description: 'SEO professionals audit existing articles by running them through Surfer\'s editor, identifying areas to update or expand for improved ranking performance.' }
        ],
        feature_groups: [
            { group: 'Core Capabilities', items: ['SERP analysis for target keywords', 'AI-powered content score (0–100)', 'Real-time keyword and topic suggestions', 'AI outline and article generation', 'Content audit'] },
            { group: 'Advanced Capabilities', items: ['Keyword research with Keyword Surfer', 'Topical mapping for content clusters', 'Jasper AI integration', 'Google Search Console integration', 'CMS publishing integrations'] }
        ],
        best_for: ['SEO content managers and strategists', 'Content writers producing organic search content', 'Digital agencies managing SEO content production', 'In-house marketing teams with SEO targets', 'Bloggers targeting search traffic'],
        pros: ['Data-driven content guidelines based on live SERP analysis', 'Real-time content scoring reduces guesswork', 'Strong integration with Jasper for AI-generation with SEO awareness', 'Useful for both creating new content and refreshing existing articles', 'Topical authority mapping supports long-term content strategy'],
        cons: ['Subscription cost makes it harder to justify for lower-volume creators', 'SEO scoring is a correlation-based heuristic, not a guarantee of ranking', 'Can encourage over-optimisation if guidelines are followed mechanically', 'AI-generated content still requires editing for quality', 'Tool complexity requires SEO knowledge to use effectively'],
        pricing_overview: `<p>Surfer SEO offers tiered subscription plans based on the number of content editors, articles, and users. Plans include different levels of SERP analysis credits, content optimisation limits, and organisation team seats. There is no permanent free plan, though trial access is typically available. Pricing is billed monthly or annually with discounts for annual commitment.</p>`,
        comparison_summary: `<p>Surfer SEO competes with Clearscope, MarketMuse, and Frase in the SEO content optimisation category. Clearscope offers a cleaner interface with strong enterprise adoption. MarketMuse provides deeper topical authority analysis. Frase combines SEO analysis with AI writing at a lower price point. Surfer differentiates on the depth of its SERP data-driven editor and its Jasper integration for AI-assisted optimised content creation.</p>`
    },

    'meta-ai': {
        long_description: `<p>Meta AI is the artificial intelligence assistant developed by Meta Platforms, built on the Llama family of open-source large language models. It is integrated across Meta's consumer applications including Facebook, Instagram, WhatsApp, and Messenger, giving it one of the largest distribution surfaces of any AI assistant.</p><p>Meta AI can answer questions, generate images, assist with content creation, and converse naturally within the platforms billions of users already access daily. The Llama models powering Meta AI are also published as open-source weights, contributing to the broader AI research and developer ecosystem independently of the consumer product.</p><p>Meta AI's primary differentiation is its distribution — accessible directly within social and messaging apps without a separate account or subscription — rather than specialised feature depth compared to dedicated AI assistant products.</p>`,
        how_it_works: `<p>Users access Meta AI by typing "@Meta AI" in a group chat, using the search bar, or accessing the dedicated Meta AI tab in supported apps. The assistant responds to queries in natural language, generates images from text prompts within chat, and can assist with tasks like writing, research, and recommendations. No separate account is needed beyond the existing Meta platform account.</p>`,
        workflows: [
            { title: 'In-Chat Information and Q&A', description: 'Users ask Meta AI questions directly within WhatsApp or Messenger conversations without opening a separate app.' },
            { title: 'Image Generation in Messaging', description: 'Users generate images from text prompts within Instagram and Facebook, embedding AI-generated visuals directly into posts or messages.' },
            { title: 'Content Ideas for Social Posts', description: 'Social media users prompt Meta AI for caption ideas, hashtag suggestions, and post concepts within the apps they already use for publishing.' },
            { title: 'Group Chat Assistance', description: 'Groups use Meta AI within shared chats to answer questions, settle debates, or research ideas without leaving the group conversation.' }
        ],
        feature_groups: [
            { group: 'Core Capabilities', items: ['Conversational AI assistant', 'Image generation', 'In-app integration across Meta platforms', 'Real-time web search for current information', 'Multilingual support'] },
            { group: 'Platform Integrations', items: ['WhatsApp integration', 'Facebook integration', 'Instagram integration', 'Messenger integration', 'Meta AI standalone web interface'] }
        ],
        best_for: ['Casual users already active on Meta platforms', 'Social media creators seeking content assistance within Instagram or Facebook', 'WhatsApp users needing quick information or answers', 'Users who prefer minimal friction over feature depth'],
        pros: ['No additional sign-up or subscription required for Meta users', 'Extraordinary distribution through existing platforms', 'Image generation built into messaging apps', 'Backed by significant research investment in Llama models', 'Free to use'],
        cons: ['Feature depth is less than dedicated assistants like ChatGPT or Claude', 'Privacy considerations in a Meta ecosystem context', 'Less suitable for professional or technical workflows', 'No persistent memory or project organisation', 'Capability varies by platform and region'],
        pricing_overview: `<p>Meta AI is free to use for all users of Meta's platforms, including WhatsApp, Facebook, Instagram, and Messenger. There is no separate subscription or premium tier for the consumer AI assistant. The Llama models used internally are published separately as open-source for developers, which is also free to download.</p>`,
        comparison_summary: `<p>Meta AI's unique position in the AI assistant market is its distribution — it reaches users inside apps they already open daily. For capability, ChatGPT and Claude are significantly more capable for professional and complex tasks. Google Gemini similarly integrates with widely used applications (Google Workspace) but targets a more productivity-oriented audience. Meta AI competes on accessibility and zero friction for casual use cases.</p>`
    },

    'sora': {
        long_description: `<p>Sora is a text-to-video generation model developed by OpenAI, announced in February 2024. It demonstrated an unprecedented level of cinematic realism in AI-generated video, capable of producing multi-subject scenes with consistent physics, coherent motion, and extended duration compared to earlier video generation tools.</p><p>Sora has been positioned as a professional creative tool for filmmakers, visual artists, and creative agencies. While initial availability was limited to select creators and testers, broader access was progressively rolled out through 2024. It is currently available to ChatGPT Plus and Pro subscribers.</p><p>Sora represents a significant benchmark in AI video generation quality, though its practical availability for high-volume commercial production remains limited by access tiers and generation constraints.</p>`,
        how_it_works: `<p>Users submit a text prompt or reference image describing the desired video scene, characters, environment, and camera motion. Sora generates a video based on these instructions, with stronger physical coherence than previous generation tools — objects maintain consistent appearance across frames and interact with environments more plausibly. Users can generate variations and extend clips. Output is available for download. Access is currently via the ChatGPT platform for qualifying subscribers.</p>`,
        workflows: [
            { title: 'Film Concept Visualisation', description: 'Directors and cinematographers generate reference clips from scene descriptions to visualise shot compositions and mood before live production.' },
            { title: 'Advertising Concept Generation', description: 'Creative agencies generate video concept clips from campaign briefs for client review at an early stage, reducing the cost of concept visualisation.' },
            { title: 'Visual Storytelling for Content', description: 'Independent creators generate narrative video content from scripted scene descriptions for use in short films and digital content series.' },
            { title: 'Scene Atmosphere and Mood Reference', description: 'Production designers use Sora to generate environmental and atmospheric video references during pre-production planning.' }
        ],
        feature_groups: [
            { group: 'Core Capabilities', items: ['Text-to-video generation', 'Image-to-video generation', 'Extended clip duration', 'Consistent character and object appearance', 'Multiple resolution and aspect ratio options'] },
            { group: 'Advanced Capabilities', items: ['Storyboard mode for multi-shot generation', 'Remix of existing clips', 'Blend mode for combining inputs', 'Loop generation for seamless video', 'Available to ChatGPT Pro subscribers'] }
        ],
        best_for: ['Professional filmmakers and directors for concept work', 'Creative agencies generating visual concepts', 'Visual artists exploring AI-generated cinema', 'Advertising and brand content producers', 'OpenAI ecosystem users with existing ChatGPT Pro access'],
        pros: ['Highest benchmark for physical realism in video generation', 'Extended clip duration compared to alternatives', 'Consistent scene coherence across frames', 'Backed by OpenAI development investment', 'Available through existing ChatGPT subscription'],
        cons: ['Limited generation volume per subscriber', 'Not suitable for high-volume commercial production at current access levels', 'Generation time can be significant', 'No fine-grained post-generation editing tools', 'Access is restricted by subscription tier'],
        pricing_overview: `<p>Sora is currently accessible to ChatGPT Plus and Pro subscribers, with Pro subscribers receiving higher priority access and generation limits. It is not available as a standalone product or API at general release. Generation volume is limited within each subscription tier. Pricing follows ChatGPT's existing subscription structure.</p>`,
        comparison_summary: `<p>Sora is the video generation quality benchmark against which Runway Gen-3, Luma Dream Machine, and Pika are compared. Runway is more accessible for professional production work with a broader editing toolkit. Luma offers strong physical realism and 3D capture at a lower price. Pika is more accessible for casual creators. Sora's position is one of demonstrated quality at limited access — its practical competition for available workflow use is currently Runway and Luma.</p>`
    },

    'duolingo-max': {
        long_description: `<p>Duolingo Max is the AI-enhanced subscription tier of Duolingo, the widely used language learning application. It was launched in 2023 and uses GPT-4 to power two AI-specific features: Explain My Answer and Roleplay. These features go beyond the standard Duolingo format of structured exercises to provide interactive AI conversation practice and personalised explanations.</p><p>Duolingo is one of the most-downloaded educational apps globally, and Max positions the platform's AI capabilities for learners who want a more immersive and interactive experience beyond the core gamified lessons. It represents one of the clearest consumer applications of large language models in education.</p><p>Duolingo Max competes for learner time with both other language apps and AI-driven language tutors like Babbel and Rosetta Stone, while occupying a unique position as a free-to-start platform with a premium AI upgrade.</p>`,
        how_it_works: `<p>Duolingo Max is accessible to users with an active Max subscription within the standard Duolingo mobile app. When a learner makes an error, the Explain My Answer feature prompts GPT-4 to provide a personalised explanation of why that answer was correct or incorrect. Roleplay mode presents scenario-based conversations — such as ordering at a cafe or checking into a hotel — where the learner interacts with an AI character as if in a real conversation. The AI evaluates responses, corrects errors, and suggests alternatives.</p>`,
        workflows: [
            { title: 'Error Explanation for Deeper Learning', description: 'Learners who do not understand why an answer was wrong use Explain My Answer to receive a contextual grammar or vocabulary explanation without leaving the app.' },
            { title: 'Conversational Practice with AI Roleplay', description: 'Learners practise fluency by engaging in AI-driven scenario conversations, building confidence in real-world dialogue patterns in a low-stakes environment.' },
            { title: 'Language Review Through Interactive Feedback', description: 'Intermediate learners use Roleplay to practise common situations (restaurants, travel, greetings) and receive immediate correction and grammar guidance.' }
        ],
        feature_groups: [
            { group: 'Standard Duolingo Features', items: ['Gamified language lessons', 'Daily streak system', '40+ languages available', 'Listening and speaking exercises', 'Hearts and leaderboard system'] },
            { group: 'Max AI Features', items: ['Explain My Answer (GPT-4 powered)', 'Roleplay conversational AI scenarios', 'Personalised error explanations', 'Scenario variety across supported languages', 'Integrated into existing Duolingo app'] }
        ],
        best_for: ['Language learners who want conversational AI practice without a human tutor', 'Duolingo users seeking deeper explanation of grammar errors', 'Beginner to intermediate learners building real-world conversation confidence', 'Learners who travel and need practical scenario preparation'],
        pros: ['Built into an app already used by millions of learners', 'AI conversation practice at scale and on demand', 'Personalised error explanations reduce confusion', 'Familiar gamified format with added AI depth', 'Accessible price relative to live tutoring'],
        cons: ['Max tier is priced above standard Duolingo Super', 'AI roleplay is not yet available for all Duolingo languages', 'Conversation depth is limited compared to a live tutor', 'Gamification may not suit all learning styles', 'Does not replace structured grammar courses for advanced learners'],
        pricing_overview: `<p>Duolingo Max is a subscription tier priced above Duolingo Super (the standard paid plan). It is billed monthly or annually and includes all Super features plus the Explain My Answer and Roleplay AI features. Duolingo's base app remains free with ads. Max availability may vary by region.</p>`,
        comparison_summary: `<p>Duolingo Max competes with Babbel, Rosetta Stone, and AI language tutors for learner time and subscription revenue. Babbel offers more structured dialogue-based lessons. Rosetta Stone emphasises immersive learning without translation. General AI assistants like ChatGPT can serve as improvised language conversation partners but without the structured curriculum and gamification of Duolingo. Max differentiates on its integration with Duolingo's existing learner base and familiar interface.</p>`
    }

};

let patched = 0;
const modified = [];
for (const tool of tools) {
    if (enrichment[tool.id]) {
        Object.assign(tool, enrichment[tool.id]);
        patched++;
        modified.push(tool.id);
    }
}
writeFileSync(PATH, JSON.stringify(tools, null, 2));
console.log(`Batch 4 complete. Patched ${patched} tools: ${modified.join(', ')}`);
