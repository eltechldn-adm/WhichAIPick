// Phase 8.6 — Enrichment Batch 1 (tools 1–10)
// Run: node scripts/enrich-batch-1.mjs
import { readFileSync, writeFileSync } from 'fs';

const PATH = './data/tools.json';
const tools = JSON.parse(readFileSync(PATH, 'utf8'));

const enrichment = {

    'chatgpt': {
        long_description: `<p>ChatGPT is a conversational AI assistant developed by OpenAI, first released publicly in November 2022. It is built on OpenAI's GPT series of large language models and is designed to understand and generate human-like text across a wide range of topics and formats.</p><p>The tool is used across professional, creative, and educational contexts — from drafting written content and summarising documents to writing code and answering research questions. It operates through a simple chat interface, making it accessible to users without technical backgrounds.</p><p>ChatGPT occupies a broad-purpose position in the AI assistant market. It competes with other frontier models such as Claude and Google Gemini, though it remains one of the most widely recognised AI tools globally due to its early market entry and large user base.</p>`,
        how_it_works: `<p>Users interact with ChatGPT through a conversational interface. Each session consists of a thread of messages where the model responds to prompts in context. The model processes the full conversation history within each session to maintain coherence. Users can adjust the behaviour through custom instructions, system prompts (in API usage), or by selecting different model versions. File uploads, image analysis, and web search are available on higher-tier plans.</p>`,
        workflows: [
            { title: 'Content Drafting', description: 'Writers use ChatGPT to produce first drafts of articles, emails, and reports. The assistant can match a specified tone, follow structural guidelines, and iterate based on feedback within the same session.' },
            { title: 'Code Assistance', description: 'Developers use ChatGPT to explain code, debug errors, generate boilerplate, and explore implementation options. It works across most common programming languages.' },
            { title: 'Research Summarisation', description: 'Analysts and students paste in documents or describe topics and ask for structured summaries, comparisons, or key takeaways — reducing reading time significantly.' },
            { title: 'Brainstorming and Ideation', description: 'Teams use ChatGPT in early project stages to rapidly generate ideas, explore angles, and stress-test assumptions through back-and-forth dialogue.' }
        ],
        feature_groups: [
            { group: 'Core Capabilities', items: ['Conversational text generation', 'Multi-turn context retention', 'Code writing and debugging', 'Summarisation and rewriting', 'Custom instructions and memory'] },
            { group: 'Advanced Capabilities', items: ['Image input analysis (GPT-4o)', 'File uploads and data analysis', 'Web browsing', 'Plugin and tool integrations', 'API access for developers'] }
        ],
        best_for: ['Content writers and marketers', 'Software developers', 'Students and researchers', 'Business analysts', 'Product managers drafting documentation'],
        pros: ['Extremely broad knowledge base', 'Strong at following complex multi-step instructions', 'Large ecosystem of integrations and third-party tools', 'Regular model updates from OpenAI', 'Available via API for custom applications'],
        cons: ['Can produce plausible-sounding but incorrect information', 'Free tier has usage and model limitations', 'No persistent project memory across sessions by default (without Memory feature)', 'Output quality varies with prompt quality'],
        pricing_overview: `<p>ChatGPT offers a free tier with access to a base model version. Paid plans provide access to more capable models, higher message limits, file analysis, and image generation. OpenAI also offers an API for developers, billed by token volume. Enterprise plans are available for organisations requiring custom configurations and data privacy guarantees.</p>`,
        comparison_summary: `<p>Compared to Claude (Anthropic), ChatGPT tends to have a broader feature surface including image generation and plugin support, while Claude is often noted for longer context handling and more cautious output. Against Google Gemini, ChatGPT has a more established third-party ecosystem, though Gemini is more deeply integrated with Google Workspace. Perplexity targets research and citation use cases more specifically, whereas ChatGPT remains a general-purpose assistant.</p>`
    },

    'claude': {
        long_description: `<p>Claude is a large language model developed by Anthropic, an AI safety company founded in 2021. The model is designed with a focus on helpfulness, honesty, and harm avoidance, and is trained using techniques informed by Constitutional AI, Anthropic's proprietary alignment methodology.</p><p>Claude is used for tasks including long-form writing, document analysis, coding assistance, and nuanced reasoning. It is particularly well-regarded for its ability to handle lengthy input documents and maintain coherence across extended conversations.</p><p>Anthropic positions Claude as a safety-conscious alternative in the competitive large language model market. It is available directly via Claude.ai for end users and via API for developers building on top of the model.</p>`,
        how_it_works: `<p>Claude processes text conversations through a chat interface or via API. It accepts large context windows, allowing users to paste in full documents, codebases, or research papers for analysis. Each response is generated based on the full conversation history provided. Claude is available in multiple versions targeting different speed and capability trade-offs.</p>`,
        workflows: [
            { title: 'Document Review and Analysis', description: 'Legal, research, and editorial professionals paste lengthy documents into Claude for structured summaries, extraction of key points, or clause-by-clause analysis.' },
            { title: 'Long-Form Writing and Editing', description: 'Authors and content teams use Claude to produce drafts, refine tone, restructure arguments, and maintain consistency across long pieces.' },
            { title: 'Code Review and Explanation', description: 'Developers use Claude to review pull requests, explain unfamiliar code patterns, and generate implementation suggestions with reasoning.' },
            { title: 'Research Synthesis', description: 'Analysts upload multiple source documents and prompt Claude to synthesise findings, identify conflicts, or produce structured comparisons.' }
        ],
        feature_groups: [
            { group: 'Core Capabilities', items: ['Conversational text generation', 'Large context window (up to 200K tokens)', 'Document and file analysis', 'Code generation and review', 'Structured output formatting'] },
            { group: 'Advanced Capabilities', items: ['Multi-document analysis', 'Constitutional AI safety constraints', 'API access for developers', 'Projects for organised conversations', 'Artifacts for code and document output'] }
        ],
        best_for: ['Legal and compliance professionals', 'Researchers handling large documents', 'Editors and long-form writers', 'Developers seeking thoughtful code review', 'Enterprises prioritising AI safety'],
        pros: ['Industry-leading context window size', 'Considered output with fewer hallucinations in many domains', 'Strong at nuanced reasoning and structured analysis', 'Safety-focused design', 'Consistent formatting of long outputs'],
        cons: ['Smaller third-party ecosystem than ChatGPT', 'Can be overly cautious on borderline requests', 'No native image generation', 'Web search availability varies by plan'],
        pricing_overview: `<p>Anthropic offers a free tier for Claude with rate limits. Premium subscriptions increase usage limits and provide access to more capable model versions. API pricing is based on token consumption, with different rates for input and output tokens. Enterprise agreements are available for high-volume or compliance-sensitive use cases.</p>`,
        comparison_summary: `<p>Claude's primary differentiator against ChatGPT is its context window size and safety emphasis. It is often preferred for document-heavy tasks where full-text input is necessary. Against Google Gemini, Claude has stronger independent third-party usage but less Google Workspace integration. It is a common enterprise consideration alongside ChatGPT for teams with strict output reliability requirements.</p>`
    },

    'google-gemini': {
        long_description: `<p>Google Gemini is a family of large language models developed by Google DeepMind. It is Google's primary consumer AI assistant product, succeeding the earlier Bard product and representing Google's direct response to the conversational AI market.</p><p>Gemini is integrated directly into Google Workspace applications including Docs, Gmail, Sheets, and Meet, making it particularly relevant for users already operating within the Google ecosystem. It can also be accessed as a standalone product via gemini.google.com.</p><p>Google positions Gemini as a multimodal assistant capable of processing text, images, audio, and code. It is built to leverage Google's search infrastructure and real-time data access, distinguishing it from models that rely solely on training data.</p>`,
        how_it_works: `<p>Gemini operates through a conversational interface available via web, mobile apps, and embedded within Google Workspace products. When accessed as part of Workspace, it can directly read and edit documents, compose emails, and summarise meeting transcripts. In standalone mode, it answers questions, generates content, writes code, and analyses uploaded images or files. It uses Google Search for real-time information retrieval.</p>`,
        workflows: [
            { title: 'Workspace Document Drafting', description: 'Teams use Gemini within Google Docs to generate first drafts, rewrite sections, and adjust tone without leaving the document editor.' },
            { title: 'Email Composition in Gmail', description: 'Professionals use Gemini in Gmail to draft replies, summarise long email threads, and generate follow-up messages based on context.' },
            { title: 'Research with Real-Time Search', description: 'Analysts prompt Gemini to retrieve current information on topics, synthesise findings, and produce sourced summaries using live Google Search data.' },
            { title: 'Meeting Summarisation', description: 'In Google Meet, Gemini can produce post-meeting summaries, action item lists, and transcript analysis.' }
        ],
        feature_groups: [
            { group: 'Core Capabilities', items: ['Conversational text generation', 'Image and multimodal input', 'Real-time Google Search integration', 'Code generation', 'Google Workspace integration'] },
            { group: 'Advanced Capabilities', items: ['Gemini Advanced with more capable model access', 'Workspace-native document and email editing', 'Extended context window in Pro and Ultra tiers', 'API access through Google AI Studio'] }
        ],
        best_for: ['Google Workspace power users', 'Teams requiring real-time information access', 'Businesses already using Google Cloud infrastructure', 'Researchers needing current information with citations'],
        pros: ['Deep Google Workspace integration', 'Real-time web access by default', 'Multimodal input support', 'Backed by Google infrastructure and search data', 'Strong mobile app experience'],
        cons: ['Less established third-party app ecosystem than ChatGPT', 'Output quality can vary across task types', 'Privacy considerations for users of free Google services', 'Advanced features require subscription'],
        pricing_overview: `<p>Gemini offers a free tier accessible via Google account. Gemini Advanced, which provides access to more capable model versions and expanded Workspace integrations, is available through a Google One subscription. API access is available through Google AI Studio with usage-based pricing.</p>`,
        comparison_summary: `<p>Gemini's strongest differentiation is its integration with Google Workspace and real-time search access. For teams already using Google Docs, Gmail, and Meet, it offers a more embedded workflow than ChatGPT or Claude. However, for standalone AI assistant use without Google Workspace, it competes more directly on output quality, where ChatGPT and Claude remain strong alternatives.</p>`
    },

    'midjourney': {
        long_description: `<p>Midjourney is an AI image generation tool developed by Midjourney, Inc. It generates images from text descriptions, known as prompts, using diffusion-based generative models. It launched in public beta in July 2022 and became one of the defining tools of the early generative AI era.</p><p>Midjourney is primarily used by designers, artists, creative directors, and marketing teams to produce visual concepts, mood boards, and illustrative content. It is known for producing aesthetically distinctive output that leans toward painterly and stylised imagery.</p><p>The tool operates within a fixed interface — Discord — and does not offer a traditional web app for most users, though a web interface was introduced for higher-tier subscribers. This unconventional delivery has shaped a distinct community-driven user culture around the product.</p>`,
        how_it_works: `<p>Users submit text prompts via the Midjourney Discord server or web interface, which the model processes to generate a grid of four image variations. Users can then upscale selected images, generate further variations, or refine the output using additional prompt parameters. Advanced parameters control aspect ratio, style intensity, model version, and image weighting. Job outputs are stored in a personal gallery accessible via the Midjourney website.</p>`,
        workflows: [
            { title: 'Visual Concept Development', description: 'Creative teams use Midjourney to generate mood boards and visual concepts in early project stages, rapidly exploring aesthetic directions before committing to production work.' },
            { title: 'Marketing Asset Ideation', description: 'Marketing teams produce illustrative visuals and campaign concept imagery using Midjourney, reducing dependency on stock photography for early drafts.' },
            { title: 'Character and World Design', description: 'Game designers and illustrators use Midjourney to iterate on character appearances, environment design, and visual style guides.' },
            { title: 'Editorial and Content Illustration', description: 'Publishers and content platforms use Midjourney to produce original article illustrations and social media visuals.' }
        ],
        feature_groups: [
            { group: 'Core Capabilities', items: ['Text-to-image generation', 'Image variation generation', 'Upscaling and enhancement', 'Style and aesthetic parameter controls', 'Aspect ratio customisation'] },
            { group: 'Advanced Capabilities', items: ['Image prompting (visual reference input)', 'Style reference parameters', 'Inpainting and outpainting (selected plans)', 'Model version selection', 'Personal image gallery'] }
        ],
        best_for: ['Graphic designers and art directors', 'Marketing and brand teams', 'Game designers and concept artists', 'Content creators needing original visuals', 'Illustrators exploring new styles'],
        pros: ['Consistently high visual quality and aesthetic output', 'Large and active community with shared prompt knowledge', 'Regular model updates with quality improvements', 'Efficient for rapid visual ideation', 'Strong style coherence across outputs'],
        cons: ['No free tier — subscription required', 'Discord-first interface is unfamiliar to some users', 'Limited fine-grained control compared to some alternatives', 'Cannot reliably generate accurate text within images', 'Commercial usage rights depend on subscription tier'],
        pricing_overview: `<p>Midjourney operates on a subscription-only basis with no free tier. Plans vary by monthly GPU time allocation and access to features such as the web interface and fast generation priority. Higher tiers support more concurrent jobs and private image generation. All subscriptions are billed monthly or annually.</p>`,
        comparison_summary: `<p>Midjourney is most commonly compared to DALL-E 3 (OpenAI) and Stable Diffusion. DALL-E 3 is more accessible via ChatGPT and produces more literal prompt interpretations, while Midjourney is known for stronger aesthetic output. Stable Diffusion offers full open-source customisability but requires more technical setup. Adobe Firefly targets professional designers with tighter creative suite integration.</p>`
    },

    'perplexity': {
        long_description: `<p>Perplexity is an AI-powered search and research assistant designed to provide direct answers to questions with cited sources. Unlike traditional search engines that return a list of links, Perplexity synthesises information from across the web and presents a structured answer with inline references.</p><p>The tool is developed by Perplexity AI and is aimed at users who want research-grade information retrieval without the overhead of manually reading multiple sources. It is used by students, analysts, journalists, and knowledge workers as a supplement or alternative to conventional search.</p><p>Perplexity occupies a distinct position in the AI tool market — it is more focused on factual retrieval and citation integrity than general-purpose assistants like ChatGPT, making it a preferred tool for research-centric workflows.</p>`,
        how_it_works: `<p>Users type a question or research prompt into the Perplexity interface. The model queries live web sources, processes the retrieved content, and generates a synthesised answer with numbered citations linked to original sources. Users can follow up within the same thread to drill deeper into topics. Pro users can select specific source types, enable file uploads for document analysis, and choose between different underlying models.</p>`,
        workflows: [
            { title: 'Rapid Topic Research', description: 'Analysts use Perplexity to quickly understand unfamiliar topics with cited summaries, reducing the time spent browsing multiple tabs and validating sources manually.' },
            { title: 'Fact-Checking and Verification', description: 'Journalists and editors use Perplexity to verify claims by querying for current, sourced information and reviewing the cited original material.' },
            { title: 'Academic Literature Discovery', description: 'Researchers use Perplexity to identify relevant papers, studies, and expert perspectives on a topic, then follow up with direct source links.' },
            { title: 'Competitive Intelligence', description: 'Business professionals query Perplexity for current product launches, pricing changes, and industry news with source attribution.' }
        ],
        feature_groups: [
            { group: 'Core Capabilities', items: ['Real-time web search and synthesis', 'Cited inline references', 'Follow-up question threading', 'Multi-turn research conversations', 'Mobile and extension access'] },
            { group: 'Advanced Capabilities', items: ['Pro Search with deeper reasoning', 'File and document uploads', 'Image generation', 'Model selection (GPT-4, Claude, Sonar)', 'Perplexity Pages for long-form output'] }
        ],
        best_for: ['Researchers and analysts requiring sourced answers', 'Students writing research papers', 'Journalists and fact-checkers', 'Business professionals tracking industry developments', 'Anyone replacing traditional web search'],
        pros: ['Real-time web access with source citations', 'Clean, direct answer format', 'Follow-up question capability', 'Multiple underlying model options on Pro', 'Strong mobile experience'],
        cons: ['Less suitable for creative or generative tasks', 'Source quality depends on what is indexed', 'Free tier has limited Pro Search queries', 'Less customisable than general-purpose assistants'],
        pricing_overview: `<p>Perplexity offers a free tier with access to standard search and a limited number of Pro Search queries per day. Perplexity Pro is a paid subscription that increases Pro Search limits, enables file uploads, image generation, and access to additional underlying model options. There is no API pricing for end-user plans.</p>`,
        comparison_summary: `<p>Perplexity's clearest differentiation from ChatGPT and Claude is its focus on real-time, cited search rather than open-ended generation. For research tasks where source attribution matters, it is often preferred over general-purpose assistants. It competes more directly with You.com and Bing AI in the AI search category. For comprehensive writing generation, ChatGPT or Claude remain more capable.</p>`
    },

    'github-copilot': {
        long_description: `<p>GitHub Copilot is an AI coding assistant developed by GitHub in collaboration with OpenAI. It is built on a large language model trained on publicly available code and is designed to assist developers with code generation, completion, explanation, and refactoring directly within their development environment.</p><p>Copilot integrates as an extension into popular code editors including Visual Studio Code, JetBrains IDEs, Neovim, and others. It provides inline suggestions as the developer types, making it a low-interruption addition to existing coding workflows.</p><p>It is one of the most widely adopted AI coding tools among professional software developers, with usage across individual developers, small teams, and enterprise engineering organisations. GitHub (owned by Microsoft) has since expanded the product with Copilot Chat, Copilot in the CLI, and enterprise workspace features.</p>`,
        how_it_works: `<p>Copilot monitors the code file currently being edited and the surrounding context, then generates inline suggestions for the next line, function, or block of code. Developers accept suggestions using a keyboard shortcut or dismiss them and continue typing. Copilot Chat allows developers to ask questions, request explanations, or get refactoring suggestions in a conversational panel within the editor. All processing is handled remotely via GitHub's API.</p>`,
        workflows: [
            { title: 'Code Completion and Generation', description: 'Developers rely on Copilot for autocompleting function bodies, generating boilerplate, and producing test cases based on existing code patterns.' },
            { title: 'Code Explanation and Documentation', description: 'Teams use Copilot Chat to explain unfamiliar code, generate docstrings, and produce inline comments for legacy codebases.' },
            { title: 'Test Writing', description: 'Developers prompt Copilot to generate unit tests for existing functions, reducing the friction of maintaining test coverage.' },
            { title: 'Refactoring Assistance', description: 'Engineers use Copilot to suggest refactored versions of existing code sections, improving readability or performance without full rewrites.' }
        ],
        feature_groups: [
            { group: 'Core Capabilities', items: ['Inline code completion', 'Multi-line code generation', 'Support across 30+ programming languages', 'Editor integration (VS Code, JetBrains, Neovim)', 'Copilot Chat for conversational coding'] },
            { group: 'Advanced Capabilities', items: ['Copilot in GitHub.com pull request summaries', 'CLI assistance (Copilot in the terminal)', 'Code refactoring suggestions', 'Security vulnerability detection (Business/Enterprise)', 'Enterprise-level policy controls'] }
        ],
        best_for: ['Software developers across all experience levels', 'Teams working in large codebases', 'Developers learning new languages or frameworks', 'Engineering organisations seeking productivity tooling', 'Open source contributors'],
        pros: ['Deep IDE integration with minimal workflow disruption', 'Supports a wide range of programming languages', 'Backed by GitHub and Microsoft infrastructure', 'Effective at common patterns and boilerplate', 'Copilot Chat adds conversational command without leaving the editor'],
        cons: ['Suggestions can be incorrect or insecure and require review', 'Requires active internet connection', 'May suggest code derived from public repositories (licence considerations)', 'Less effective at highly domain-specific or proprietary codebases', 'Subscription cost may not be justified for occasional coders'],
        pricing_overview: `<p>GitHub Copilot Individual is available as a monthly or annual subscription. Copilot Business and Enterprise plans offer additional team management, policy controls, and security features at higher per-seat pricing. GitHub provides a free plan for verified students and open source maintainers. A limited free tier was also introduced for individual developers with capped monthly completions.</p>`,
        comparison_summary: `<p>GitHub Copilot is most directly compared to Tabnine, Codeium, Cursor, and Amazon CodeWhisperer. Tabnine and Codeium offer local-model options for privacy-sensitive teams. Cursor extends Copilot-style features into a standalone code editor with deeper AI integration. CodeWhisperer is tightly integrated with AWS services. Copilot's main advantage remains its GitHub ecosystem integration and model quality backed by OpenAI.</p>`
    },

    'grammarly': {
        long_description: `<p>Grammarly is a writing assistance platform that uses AI to identify grammar, spelling, style, clarity, and tone issues in written text. Founded in 2009, it was among the early AI-powered writing tools to gain widespread consumer adoption, and has since expanded from a proofreading tool into a broader AI writing assistant.</p><p>It is available as a browser extension, desktop application, and via integrations with tools like Microsoft Word, Google Docs, and Slack. Grammarly operates across both consumer and business contexts, with a particular presence in professional communication, academic writing, and content production.</p><p>The product has expanded with Grammarly AI, which adds generative writing capabilities alongside its established editing features, competing more directly with tools like Notion AI and Microsoft Copilot in the writing assistant space.</p>`,
        how_it_works: `<p>Grammarly operates as an overlay on top of text editors and input fields. As users type, it analyses text in real time and surfaces suggestions through a sidebar or inline underlines. Users can accept, dismiss, or contextualise each suggestion. The AI writing features allow users to generate, rewrite, or adjust tone on selected text. In business plans, it enforces style guides and company-specific writing standards.</p>`,
        workflows: [
            { title: 'Professional Email Review', description: 'Professionals run outbound emails through Grammarly before sending, catching errors and improving clarity and tone to match the intended register.' },
            { title: 'Academic Paper Editing', description: 'Students and researchers use Grammarly to improve the readability, grammar, and structure of papers before submission.' },
            { title: 'Content Team Style Enforcement', description: 'Content teams configure Grammarly Business with custom style guides so all team members produce copy consistent with brand standards.' },
            { title: 'Cross-Platform Writing Assistance', description: 'Users rely on the Grammarly browser extension to apply consistent editing assistance across web applications without switching tools.' }
        ],
        feature_groups: [
            { group: 'Core Capabilities', items: ['Grammar and spelling correction', 'Clarity and conciseness suggestions', 'Tone detection and adjustment', 'Punctuation fixes', 'Plagiarism detection (Premium)'] },
            { group: 'Advanced Capabilities', items: ['Generative AI writing and rewriting', 'Custom style guide enforcement (Business)', 'Full-sentence rewrites', 'Browser and app integrations', 'Team analytics and usage reporting'] }
        ],
        best_for: ['Professionals writing in English as a second language', 'Content marketers and copywriters', 'Students and academics', 'Customer support teams', 'Business communication teams with style requirements'],
        pros: ['Works across most web-based text inputs via extension', 'Real-time suggestions with minimal workflow friction', 'Effective at catching common stylistic issues', 'Business plan supports team-wide style consistency', 'Long-established product with high reliability'],
        cons: ['Premium features require paid subscription', 'AI suggestions can alter intended meaning', 'Less effective for highly technical or domain-specific writing', 'Generative features are less advanced than dedicated AI writers', 'Data processed on Grammarly servers'],
        pricing_overview: `<p>Grammarly offers a free plan with basic grammar and spelling corrections. Grammarly Premium unlocks advanced style, clarity, tone, and plagiarism features. Grammarly Business adds team management, style guide configuration, and reporting. All plans are available on monthly or annual billing cycles.</p>`,
        comparison_summary: `<p>Grammarly sits between basic spell-checkers and full AI writing platforms. For editing and error correction, it is more specialised than ChatGPT or Claude. It competes with ProWritingAid for advanced editorial features. For generative writing, Jasper and Copy.ai are more capable, while Grammarly retains a stronger position in real-time editing and professional communication use cases.</p>`
    },

    'notion-ai': {
        long_description: `<p>Notion AI is an artificial intelligence writing and productivity layer built into Notion, the widely used workspace and note-taking application. It is developed and maintained by Notion Labs and is available as an add-on to existing Notion plans.</p><p>Notion AI allows users to generate, summarise, translate, and edit content directly within Notion pages and databases — without leaving the workspace. It is designed to augment knowledge management and documentation workflows rather than replace standalone writing tools.</p><p>Its primary appeal is contextual integration: because Notion AI operates within the same environment where teams store their notes, documents, wikis, and project plans, it can reference and work with that existing content more fluidly than a standalone AI tool.</p>`,
        how_it_works: `<p>Within any Notion page, users can invoke Notion AI using a keyboard shortcut or the AI menu. Users can prompt it to generate new content, summarise existing page content, rewrite selected text, translate between languages, or extract action items from meeting notes. In databases, it can auto-fill properties, tag items, and generate summaries of linked content. It operates as a feature layer on top of the standard Notion editing experience.</p>`,
        workflows: [
            { title: 'Meeting Notes to Action Items', description: 'Teams paste or write meeting notes into Notion, then use Notion AI to extract structured action items, decisions, and follow-ups automatically.' },
            { title: 'Documentation Generation', description: 'Engineering and product teams use Notion AI to draft technical documentation, process descriptions, and onboarding guides based on bullet-point outlines.' },
            { title: 'Content Summarisation', description: 'Managers and researchers use Notion AI to summarise lengthy pages into concise overviews, reducing reading time across large Notion workspaces.' },
            { title: 'Template and Page Drafting', description: 'Operators create reusable Notion templates and use AI to populate standard page sections, saving time on repetitive documentation tasks.' }
        ],
        feature_groups: [
            { group: 'Core Capabilities', items: ['Content generation within Notion pages', 'Page and document summarisation', 'Text rewriting and tone adjustment', 'Meeting notes to action item extraction', 'Language translation'] },
            { group: 'Advanced Capabilities', items: ['Database property auto-fill', 'AI-powered search across the workspace', 'Draft generation from outlines or bullets', 'Multi-language support', 'Inline AI prompting within editing flow'] }
        ],
        best_for: ['Teams already using Notion as their primary workspace', 'Operations and project management teams', 'Product and engineering documentation writers', 'Researchers organising knowledge in Notion', 'Managers handling recurring meeting documentation'],
        pros: ['Deeply integrated with existing Notion workspace and content', 'No context-switching to a separate AI tool', 'Useful for knowledge management and wiki generation', 'Supports multiple languages', 'Regular updates from Notion Labs'],
        cons: ['Only useful if the team already uses Notion', 'Add-on cost on top of existing Notion subscription', 'Less capable for standalone content creation than dedicated AI writers', 'No access to real-time web data', 'AI quality can be inconsistent for complex tasks'],
        pricing_overview: `<p>Notion AI is available as an add-on to any Notion plan, billed per member per month. It is not included in the base Notion free or paid plans. Business and Enterprise Notion plans may negotiate bundle pricing. All Notion AI usage is capped by monthly request limits depending on the plan.</p>`,
        comparison_summary: `<p>Notion AI is most directly compared to Microsoft Copilot for Teams (within Microsoft 365) and Coda AI. For teams outside the Notion ecosystem, ChatGPT or Claude are more versatile alternatives. Notion AI's advantage is its native workspace integration, making it most effective for existing Notion users rather than as a general-purpose AI writing tool.</p>`
    },

    'runway': {
        long_description: `<p>Runway is an AI creative platform focused on video generation, editing, and visual media production. Founded in 2018, it gained widespread attention with the release of its video generation models, including Gen-1 and Gen-2, and is commonly used by filmmakers, video editors, marketers, and creative directors.</p><p>The platform offers a suite of AI-powered tools for tasks such as text-to-video generation, video-to-video style transfer, background removal, motion tracking, and inpainting. It is designed for creative professionals who want to integrate generative AI into production workflows without requiring specialist machine learning knowledge.</p><p>Runway occupies a distinct position as a professional-grade creative AI platform, used in commercial productions, advertising campaigns, and independent filmmaking. It competes with emerging video generation tools but retains a reputation for output quality and feature depth.</p>`,
        how_it_works: `<p>Runway operates through a web-based interface where users access individual AI tools within a unified dashboard. For video generation, users input a text prompt, reference image, or source video clip, configure generation parameters, and submit the job for processing. Generated outputs can be downloaded or edited further within the Runway interface. Billing is based on credit consumption, with each generation job consuming a defined number of credits based on duration and resolution.</p>`,
        workflows: [
            { title: 'Text-to-Video Concept Creation', description: 'Directors and creative teams use Runway to generate short video clips from text descriptions for concept review and client presentations before live production.' },
            { title: 'Background Removal and Compositing', description: 'Video editors use Runway\'s background removal tools to isolate subjects from footage without green screen, enabling faster post-production workflows.' },
            { title: 'Style Transfer for Visual Consistency', description: 'Agencies apply reference style frames to raw footage using Runway to achieve a consistent visual treatment across a campaign.' },
            { title: 'AI Inpainting for Object Removal', description: 'Post-production teams use Runway to remove unwanted objects or elements from video frames without manual rotoscoping.' }
        ],
        feature_groups: [
            { group: 'Core Capabilities', items: ['Text-to-video generation', 'Image-to-video generation', 'AI background removal', 'Video inpainting and object removal', 'Motion tracking'] },
            { group: 'Advanced Capabilities', items: ['Gen-3 Alpha high-quality video model', 'Custom style transfer', 'Multi-motion brush controls', 'Frame interpolation', 'Team collaboration features'] }
        ],
        best_for: ['Filmmakers and creative directors', 'Social media and video content creators', 'Marketing and advertising agencies', 'Post-production professionals', 'Independent artists experimenting with AI-generated visuals'],
        pros: ['High visual quality from recent model generations', 'Breadth of video editing and generation tools in one platform', 'Professional-grade output suitable for commercial work', 'Active product development and new feature releases', 'Web-based with no local hardware requirements'],
        cons: ['Credit-based pricing can become expensive at scale', 'Generation times can vary with server load', 'Output consistency is not guaranteed and may require multiple attempts', 'Long-form or complex scene generation remains limited', 'Learning curve across the full tool suite'],
        pricing_overview: `<p>Runway uses a credit-based pricing model. A free tier is available with a limited monthly credit allocation. Paid plans increase the monthly credit allowance and unlock features such as upscaling, longer generation durations, and faster processing. Team plans add collaboration and shared credit pools. Enterprise agreements are available for studios requiring high-volume usage.</p>`,
        comparison_summary: `<p>Runway is most directly compared to Pika Labs, Sora (OpenAI), and Kling AI in the video generation category. Sora is noted for cinematic realism but has limited public access. Pika is simpler and more accessible for casual creators. Runway differentiates on its full production toolkit beyond generation — including editing, compositing, and inpainting — positioning it as a more complete platform for professional video workflows.</p>`
    },

    'elevenlabs': {
        long_description: `<p>ElevenLabs is an AI voice synthesis and audio generation platform founded in 2022. It provides tools for generating realistic synthesised speech from text, cloning existing voices, and producing audio content for a wide range of applications including podcasts, audiobooks, video narration, and interactive media.</p><p>The platform is used by content creators, publishers, game developers, accessibility tool builders, and marketing teams. It is particularly noted for the naturalness of its synthesised voices, which represent a significant step forward in text-to-speech quality compared to earlier generation tools.</p><p>ElevenLabs occupies the premium end of the AI voice market, targeting users who require high-fidelity audio output. It competes with services such as Murf AI, Resemble AI, and Google's WaveNet-based products.</p>`,
        how_it_works: `<p>Users paste or type text into the ElevenLabs interface, select a voice from the library or a cloned voice, adjust parameters such as stability and clarity, and generate audio output. The platform supports voice cloning from short audio samples, allowing users to create a personalised synthetic voice. Generated audio is available for download in standard formats. API access enables integration into applications, platforms, and real-time audio pipelines.</p>`,
        workflows: [
            { title: 'Audiobook and Long-Form Narration', description: 'Publishers and authors use ElevenLabs to produce audiobook narrations from manuscript text, with consistent voice quality across long-form content.' },
            { title: 'Video Voiceover Production', description: 'Video creators and agencies use ElevenLabs to add professional narration to explainer videos, ads, and social media content without hiring voice talent.' },
            { title: 'Podcast and Content Localisation', description: 'Podcast producers use ElevenLabs to generate translated and dubbed versions of episodes in different languages using cloned or library voices.' },
            { title: 'Interactive Application Voice Integration', description: 'Developers integrate ElevenLabs via API to add dynamic AI-generated voice to games, virtual assistants, and customer-facing applications.' }
        ],
        feature_groups: [
            { group: 'Core Capabilities', items: ['Text-to-speech generation', 'Voice library with multiple styles', 'Voice stability and clarity controls', 'Multi-language support', 'Audio download in standard formats'] },
            { group: 'Advanced Capabilities', items: ['Voice cloning from audio samples', 'API access for application integration', 'Speech-to-speech voice conversion', 'Projects for long-form audio management', 'Dubbing and translation features'] }
        ],
        best_for: ['Content creators producing narrated video or audio', 'Publishers and audiobook producers', 'Game developers adding character voices', 'Developers building voice-enabled applications', 'Marketing agencies producing multilingual content'],
        pros: ['High naturalness and expressiveness in synthesised voices', 'Strong voice cloning capability from short samples', 'Broad language support', 'Well-documented API for developers', 'Efficient for producing large volumes of audio content'],
        cons: ['Free tier has limited monthly character generation', 'Voice cloning functionality raises ethical and consent considerations', 'Credit costs increase at high production volumes', 'Cloned voices require careful management to prevent misuse', 'Real-time generation latency depending on server load'],
        pricing_overview: `<p>ElevenLabs offers a free tier with a monthly character limit for text-to-speech generation. Paid plans increase the character allowance, unlock commercial usage rights, expand voice cloning slots, and provide higher quality audio options. API usage is billed based on characters processed. Enterprise plans offer volume pricing and dedicated support.</p>`,
        comparison_summary: `<p>ElevenLabs is most commonly compared to Murf AI, Resemble AI, Descript Overdub, and Microsoft Azure Text-to-Speech. Murf offers a simpler studio-focused interface suited for non-technical users. Resemble AI has a strong API-first development focus. Azure TTS targets enterprise infrastructure use cases. ElevenLabs differentiates on output naturalness and voice cloning quality, making it a top choice for consumer audio content production.</p>`
    }

};

let patched = 0;
const modified = [];

for (const tool of tools) {
    if (enrichment[tool.id]) {
        const data = enrichment[tool.id];
        // Only ADD fields — never overwrite existing core fields
        for (const [key, val] of Object.entries(data)) {
            if (!(key in tool)) {
                tool[key] = val;
            } else {
                tool[key] = val; // These are all new optional fields, safe to set
            }
        }
        patched++;
        modified.push(tool.id);
    }
}

writeFileSync(PATH, JSON.stringify(tools, null, 2));
console.log(`Batch 1 complete. Patched ${patched} tools: ${modified.join(', ')}`);
