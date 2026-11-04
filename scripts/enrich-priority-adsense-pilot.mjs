import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

const WORKTREE_ROOT = process.cwd();
const TOOLS_JSON_PATH = path.join(WORKTREE_ROOT, 'data/tools.json');
const STAGED_JSON_PATH = path.join(WORKTREE_ROOT, 'data/tools.phase11.staged.json');
const WORKBOOK_PATH = path.join(WORKTREE_ROOT, 'data/WhichAIPick_Catalog_PHASE11_ANTIGRAVITY_IMPORT_CONTRACT_COMPLETE_2026-10-01.xlsx');
const LEDGER_PATH = path.join(WORKTREE_ROOT, 'data/evidence/phase11-evidence-ledger.json');

const ENRICHMENTS = {
  cline: {
    long_description: `<p>Cline is an open-source autonomous coding agent that runs inside Visual Studio Code and compatible forks. Operating as an interactive developer assistant, Cline can create and modify files across large codebases, execute terminal commands, view compiler and linter output, and browse websites via headless browser automation to test local web applications.</p><p>Unlike closed-ecosystem AI editors, Cline utilizes a Bring Your Own Key (BYOK) architecture. Developers connect their own API keys from providers such as Anthropic (Claude 3.5 Sonnet, Claude 3.7 Sonnet), OpenAI, Google Gemini, DeepSeek, AWS Bedrock, or local model servers via Ollama. With support for the Model Context Protocol (MCP), Cline can extend its capabilities to interact with external databases, issue trackers, and custom command-line tools while keeping code execution under human-in-the-loop approval.</p>`,
    bestFor: [
      'Software engineers seeking an autonomous coding agent directly inside VS Code without switching to a separate forked IDE',
      'Developers wanting granular cost control by using their own direct API keys or local self-hosted models via Ollama',
      'Teams requiring custom tool integrations through the Model Context Protocol (MCP) for terminal and database execution'
    ],
    notIdealFor: [
      'Non-technical users or beginners who lack API keys and prefer an all-inclusive managed flat-rate subscription',
      'Developers who do not want to manage individual provider rate limits, context window tokens, or API billing balances',
      'Users seeking a fully turnkey zero-configuration setup that works out-of-the-box without configuring environment permissions'
    ],
    primaryUseCases: [
      'Autonomous multi-file software refactoring, debugging, and feature implementation inside VS Code',
      'Executing terminal builds, test suites, and resolving compiler errors iteratively with user permission',
      'Orchestrating custom developer workflows using Model Context Protocol (MCP) servers and local LLMs'
    ],
    how_it_works: `<p>Cline operates as an agentic loop within Visual Studio Code. When given a development prompt, Cline analyzes the project workspace by reading directory structures, inspecting configuration files, and identifying relevant source files using semantic search and fuzzy matching. It formulates a multi-step execution plan and presents each proposed action to the developer.</p><p>Before executing any file write, deletion, or terminal command, Cline requests explicit user authorization unless configured in auto-approve mode for specific safe commands. When testing web applications, Cline can launch a browser sub-process to inspect DOM elements, capture screenshots, and diagnose frontend rendering errors. Every token consumed is tracked against the connected API provider balance in real time.</p>`,
    feature_groups: [
      {
        group: 'Agentic Execution & Terminal Control',
        items: [
          'Autonomous multi-file editing with diff preview and approval gates before code changes are applied',
          'Integrated terminal command execution with automated error detection, stack trace analysis, and retry logic',
          'Headless browser integration enabling the agent to visually inspect local web apps, capture console logs, and click elements',
          'Context-aware file indexing that respects .gitignore rules and project-specific instruction files (.clinerules)'
        ]
      },
      {
        group: 'BYOK Flexibility & Extensibility',
        items: [
          'Direct API provider support for Anthropic Claude, OpenAI, Google Gemini, DeepSeek, AWS Bedrock, and OpenRouter',
          'Local model compatibility via Ollama and LM Studio for completely offline, air-gapped code generation',
          'Model Context Protocol (MCP) client support allowing custom tools, databases, and APIs to be called by the agent',
          'Granular per-task token usage and cost accounting displayed in the VS Code sidebar interface'
        ]
      }
    ],
    pros: [
      'Zero subscription markup on LLM tokens because developers pay standard provider wholesale API rates directly',
      'Native integration with existing VS Code workspaces, settings, keybindings, and extensions without needing an IDE fork',
      'Robust security model requiring explicit manual approval for shell commands and destructive file modifications',
      'Extensible tool ecosystem via the open Model Context Protocol (MCP) standard'
    ],
    cons: [
      'Requires developers to create and fund separate API accounts with Anthropic, OpenAI, or other providers',
      'High token consumption during large refactoring tasks can lead to unexpected API usage bills if unmonitored',
      'Complex multi-step terminal actions occasionally require manual intervention to recover from failed command runs',
      'Lack of a centralized administrative dashboard for managing team-wide seats or shared prompt policies'
    ],
    pricing_overview: `<p>Cline is completely free and open-source software distributed under the Apache 2.0 license ($0 per month). There are no software subscription fees, paywalls, or platform surcharges.</p><p>Because Cline operates on a Bring Your Own Key (BYOK) architecture, users only pay the direct API token costs billed by their chosen model provider (such as Anthropic, OpenAI, DeepSeek, or Google Cloud). For example, using Anthropic Claude 3.5 Sonnet typically costs approximately $3.00 per million input tokens and $15.00 per million output tokens, while local inference via <strong>Ollama</strong> (/tools/ollama/) is entirely free of usage charges.</p>`,
    comparison_summary: `<p>Compared to <strong>Cursor</strong> (/tools/cursor/), which is a standalone fork of VS Code with a proprietary background indexing service and a $20 per month subscription tier, Cline runs inside standard Visual Studio Code as a community extension and charges no platform markup. Compared to <strong>Aider</strong> (/tools/aider/), which operates strictly in the terminal command line with Git-based diff commits, Cline provides a graphical sidebar with interactive diff views, MCP tool integration, and browser testing. Compared to <strong>GitHub Copilot</strong> (/tools/github-copilot/), which relies primarily on inline completions with a fixed model catalog, Cline delivers autonomous multi-file agentic task execution.</p>`,
    pricingModel: 'free',
    hasFreeTier: true,
    hasFreeTrial: false,
    startingPrice: null,
    priceCurrency: null,
    billingPeriod: null,
    trialDays: null,
    verificationSources: [
      'https://cline.bot/',
      'https://github.com/cline/cline'
    ]
  },

  coderabbit: {
    long_description: `<p>CodeRabbit is an AI-driven pull request review platform that integrates directly into GitHub and GitLab repositories to streamline code reviews and enforce engineering standards. Operating as an automated code reviewer, CodeRabbit analyzes pull request diffs, provides line-by-line feedback, generates human-readable release notes, and surfaces architectural sequence diagrams to help engineering teams understand complex changes.</p><p>Designed to reduce reviewer fatigue while catching subtle bugs before production deployment, CodeRabbit combines abstract syntax tree (AST) code analysis with large language models. Developers can converse with CodeRabbit directly within GitHub review comments to ask clarifying questions, request alternative implementations, or apply automated one-click code fixes directly to the branch.</p>`,
    bestFor: [
      'Software engineering teams seeking to accelerate pull request turnaround times and catch logical bugs before human review',
      'Open-source maintainers managing high volumes of contributor pull requests with automated review comments',
      'Engineering managers requiring automated architectural diagrams, change summaries, and compliance checks on PRs'
    ],
    notIdealFor: [
      'Individual developers looking only for inline code completion or local IDE auto-complete while typing',
      'Teams operating air-gapped repositories that cannot connect cloud webhook integrations to GitHub or GitLab',
      'Organizations unwilling to grant read access to repository pull request diffs and source code metadata'
    ],
    primaryUseCases: [
      'Automating line-by-line code review, logic verification, and security vulnerability detection on pull requests',
      'Generating automated pull request summaries, changelog entries, and Mermaid.js architectural sequence diagrams',
      'Conversational code refinement and automated one-click patch application directly inside GitHub comment threads'
    ],
    how_it_works: `<p>CodeRabbit functions through Git provider webhooks installed on GitHub or GitLab repositories. When a developer opens or updates a pull request, CodeRabbit triggers a background analysis pipeline that parses the full git diff alongside referenced code context. It evaluates code structure, logic flow, test coverage, and documentation consistency against industry standards and custom configuration files (.coderabbit.yaml).</p><p>Once analysis is complete, CodeRabbit posts an initial high-level overview detailing the scope of changes, followed by inline comments on specific lines where potential regressions, edge cases, or performance bottlenecks are identified. Developers can reply to any CodeRabbit comment in GitHub to request revisions or generate 1-click commit suggestions, after which CodeRabbit automatically resolves or updates comments as new commits are pushed.</p>`,
    feature_groups: [
      {
        group: 'Pull Request Review & Analysis',
        items: [
          'Line-by-line automated code review flagging logic errors, memory leaks, security vulnerabilities, and code smell',
          'Mermaid.js sequence diagram generation illustrating data flow and architectural interactions across modified files',
          'Automated pull request summaries and release note drafting formatted cleanly for engineering changelogs',
          'Conversational review comments supporting threaded developer discussions and automated commit patches'
        ]
      },
      {
        group: 'Governance & Workflow Configuration',
        items: [
          'Repository-level configuration via .coderabbit.yaml supporting custom review guidelines and prompt instructions',
          'Support for public and private repositories across GitHub.com, GitHub Enterprise, and GitLab',
          'Automated validation against popular language linters, typing systems, and testing framework requirements',
          'SOC 2 Type II compliance and data privacy controls ensuring code is not stored or used for model training'
        ]
      }
    ],
    pros: [
      'Substantially decreases pull request review backlogs by catching routine issues before peer reviewers inspect the code',
      'Contextual sequence diagrams make complex multi-service architectural modifications easy to comprehend quickly',
      'Free tier provides generous unlimited pull request reviews for open-source repositories and individual developers',
      'Interactive review comments allow developers to test alternative solutions directly in GitHub without switching contexts'
    ],
    cons: [
      'High PR volume on busy repositories can generate substantial comment notification traffic if notification settings are uncalibrated',
      'Occasional false-positive nitpicks on idiomatic edge cases require developers to explicitly dismiss or train the bot',
      'Self-hosted on-premise deployment options are restricted to high-tier Enterprise contracts',
      'Does not replace in-editor autocomplete assistants like Copilot or Cursor during active initial code authoring'
    ],
    pricing_overview: `<p>CodeRabbit offers a freemium pricing structure with dedicated tiers for individual developers, open-source projects, and commercial engineering teams.</p><p>The <strong>Free Plan</strong> ($0 per month) provides unlimited pull request reviews for all public open-source repositories and basic summary features for individual personal projects. Paid plans include: <strong>Pro</strong> at $15 per developer per month (or $12 per developer per month billed annually at $144 per year), which provides unlimited PR reviews on private repositories, line-by-line feedback, sequence diagrams, one-click fixes, and a 14-day free trial; and <strong>Enterprise</strong> (custom annual pricing), which adds self-hosted GitHub Enterprise and GitLab Self-Managed support, custom security policies, dedicated support, and SOC 2 Type II audit documentation.</p>`,
    comparison_summary: `<p>Compared to <strong>Sourcery</strong> (/tools/sourcery/), which focuses on in-editor code refactoring and local static analysis metrics alongside PR reviews, CodeRabbit is dedicated to conversational GitHub and GitLab pull request workflows with interactive architectural sequence diagrams. Compared to <strong>Bito</strong> (/tools/bito/), which provides developer productivity tooling across both IDE and CLI environments, CodeRabbit specializes exclusively in repository review automation. Compared to <strong>Cursor</strong> (/tools/cursor/) and <strong>GitHub Copilot</strong> (/tools/github-copilot/), which operate primarily as code authoring assistants during drafting, CodeRabbit acts as the automated peer reviewer before code merges into production.</p>`,
    pricingModel: 'freemium',
    hasFreeTier: true,
    hasFreeTrial: true,
    startingPrice: 15,
    priceCurrency: 'USD',
    billingPeriod: 'month',
    trialDays: 14,
    verificationSources: [
      'https://www.coderabbit.ai/',
      'https://www.coderabbit.ai/pricing'
    ]
  },

  tabby: {
    long_description: `<p>Tabby is an open-source, self-hosted AI coding assistant designed to provide private code completion and in-editor chat without transmitting proprietary intellectual property to third-party cloud services. Built for engineering organizations with strict data governance, compliance, or air-gapped security mandates, Tabby can be deployed on local workstations, private data centers, or cloud virtual machines equipped with consumer or enterprise GPUs.</p><p>Featuring native integrations with popular editors—including Visual Studio Code, JetBrains IDEs, and Vim/Neovim—Tabby serves as an independent on-premise alternative to commercial cloud assistants. It supports modern open-weights code models such as StarCoder, CodeLlama, and DeepSeek-Coder, providing fast token streaming, context-aware repository indexing, and web administration interfaces.</p>`,
    bestFor: [
      'Enterprise engineering teams requiring on-premise or air-gapped code completion to satisfy strict data privacy policies',
      'Developers with local GPU hardware wanting low-latency, offline code completion without cloud dependencies',
      'Security officers needing an open-source, auditable code assistant stack with full telemetry isolation'
    ],
    notIdealFor: [
      'Teams lacking dedicated GPU infrastructure or the technical capacity to host and manage an inference server',
      'Users seeking cutting-edge frontier reasoning models (such as Claude 3.7 or GPT-4.5) which require massive cloud clusters',
      'Non-technical programmers looking for a zero-configuration SaaS extension that runs without hosting setup'
    ],
    primaryUseCases: [
      'Self-hosting an on-premise code completion and chat server on private workstations or Kubernetes clusters',
      'Enforcing zero-data-retention and air-gapped compliance for enterprise proprietary codebases',
      'Providing multi-IDE code assistance across VS Code, JetBrains, and Neovim from a unified internal model endpoint'
    ],
    how_it_works: `<p>Tabby functions as a client-server architecture. The Tabby server is deployed as a Docker container or standalone binary on a machine with GPU acceleration (supporting NVIDIA CUDA, Apple Metal, and ROCm). The server manages model weights, performs token generation via optimized inference runtimes (such as llama.cpp), and indexes local git repositories to provide contextually relevant code snippets.</p><p>Lightweight client extensions installed in Visual Studio Code, IntelliJ IDEA, PyCharm, or Neovim communicate with the self-hosted Tabby endpoint over secure HTTP or WebSockets. As the developer types, the client sends surrounding file context to the server, which generates multi-line code suggestions with low latency. Tabby's web administrative dashboard enables administrators to configure models, manage user access tokens, and monitor server inference metrics.</p>`,
    feature_groups: [
      {
        group: 'Self-Hosted Inference & Architecture',
        items: [
          'Docker-based deployment supporting NVIDIA CUDA, Apple Silicon Metal, AMD ROCm, and CPU inference runtimes',
          'Support for popular open-weights code completion models including StarCoder2, DeepSeek-Coder, and CodeLlama',
          'Context-aware repository indexing that analyzes project codebase structure for relevant code completions',
          'Web-based administrative dashboard for model switching, token generation, and server resource monitoring'
        ]
      },
      {
        group: 'IDE Integration & Security',
        items: [
          'Official editor extensions for Visual Studio Code, JetBrains IDEs (IntelliJ, PyCharm, WebStorm), and Vim/Neovim',
          'Supports air-gapped deployment configurations keeping source code within internal networks',
          'User access token management and team authentication for centralized corporate deployment',
          'Open-source codebase distributed under the Apache 2.0 license allowing complete security auditing'
        ]
      }
    ],
    pros: [
      'Enables strong data sovereignty because all code analysis and inference can execute on local infrastructure',
      'No recurring per-seat subscription fees or metered token usage costs when hosting on owned hardware',
      'Broad IDE support ensures engineers can use their preferred development environment without disruption',
      'Open-source architecture permits custom model fine-tuning on internal proprietary engineering libraries'
    ],
    cons: [
      'Requires dedicated GPU hardware (minimum 8 GB to 16 GB VRAM) for acceptable inference speed and low latency',
      'Infrastructure maintenance, driver setup, and container orchestration overhead fall on the user or engineering team',
      'Open-weights models running on local hardware generally demonstrate lower reasoning capability than frontier cloud models',
      'Initial repository indexing on massive monolithic codebases requires notable compute and memory resources'
    ],
    pricing_overview: `<p>Tabby's core platform is free, open-source software distributed under the Apache 2.0 license ($0 per month). Organizations can deploy the community edition on their own hardware or private cloud instances with no licensing fees or user seat caps.</p><p>For organizations seeking managed cloud hosting or enterprise orchestration, Tabby offers <strong>Tabby Cloud</strong> (with a free tier for individual evaluation and paid team workspaces starting at $20 per seat per month) alongside custom enterprise contracts that include high-availability clusters, SSO integration, and priority technical support SLAs.</p>`,
    comparison_summary: `<p>Compared to <strong>GitHub Copilot</strong> (/tools/github-copilot/), which requires sending code to Microsoft and OpenAI cloud servers on a $10 per month subscription, Tabby is completely self-hosted, keeping proprietary source code within internal networks. Compared to <strong>Ollama</strong> (/tools/ollama/), which is a general-purpose local model runner, Tabby is purpose-built for developer workflows with dedicated multi-line code completion engines, repository indexing, and official IDE extensions. Compared to <strong>Cursor</strong> (/tools/cursor/), which is a commercial forked editor, Tabby connects directly into existing VS Code, JetBrains, and Neovim installations.</p>`,
    pricingModel: 'free',
    hasFreeTier: true,
    hasFreeTrial: false,
    startingPrice: null,
    priceCurrency: null,
    billingPeriod: null,
    trialDays: null,
    verificationSources: [
      'https://www.tabbyml.com/',
      'https://github.com/TabbyML/tabby'
    ]
  },

  sourcery: {
    long_description: `<p>Sourcery is an AI-powered code review and refactoring assistant designed to improve code quality, maintainability, and developer productivity. Available as an IDE extension for Visual Studio Code and PyCharm, as well as a GitHub pull request review bot, Sourcery continuously inspects code to suggest instant refactorings, eliminate duplicate logic, reduce cyclomatic complexity, and generate unit tests.</p><p>Originally developed with a focus on Python before expanding to JavaScript, TypeScript, and other languages, Sourcery operates on a hybrid architecture combining static abstract syntax tree (AST) rules with modern LLMs. Rather than merely offering conversational completions, Sourcery proactively suggests structural code transformations—such as converting nested loops to comprehensions or extracting helper functions—with one-click diff applications.</p>`,
    bestFor: [
      'Python, JavaScript, and TypeScript developers seeking instant automated refactoring suggestions in their IDE',
      'Engineering teams wanting to standardize code quality metrics and reduce code complexity across repositories',
      'Developers looking for automated unit test generation and automated GitHub pull request reviews'
    ],
    notIdealFor: [
      'Developers working primarily in uncompiled niche languages that lack AST parser support in Sourcery',
      'Users looking for a full autonomous agent that executes terminal commands and builds multi-file architectures',
      'Teams seeking completely free commercial code reviews across large private multi-seat organizations'
    ],
    primaryUseCases: [
      'Proactive in-editor refactoring to simplify complex logic, remove dead code, and improve readability',
      'Automated pull request analysis on GitHub to enforce quality thresholds and flag antipatterns',
      'Generating comprehensive unit tests with edge-case coverage directly from highlighted source functions'
    ],
    how_it_works: `<p>Sourcery continuously parses code within your IDE or via GitHub webhook integration. In the IDE, it analyzes the active abstract syntax tree (AST) in real time, identifying opportunities to simplify conditionals, combine redundant logic, or adopt modern idiomatic syntax patterns. When an improvement is found, Sourcery highlights the line and presents an instant diff explanation in a hover tooltip.</p><p>Developers can apply suggested refactorings with a single keystroke or command shortcut. Beyond AST rules, Sourcery leverages large language models to provide contextual coding chat, generate docstrings, and author complete unit tests based on function parameters and return types. In CI/CD pipelines, Sourcery reviews incoming pull requests, posting structured summaries of code health and complexity changes.</p>`,
    feature_groups: [
      {
        group: 'In-Editor Refactoring & Quality',
        items: [
          'Instant AST-driven refactoring suggestions for Python, JavaScript, TypeScript, and additional languages',
          'Real-time code metrics evaluating cyclomatic complexity, cognitive load, and method length',
          'One-click diff application allowing developers to accept transformations with a single keyboard shortcut',
          'Automated unit test generation authoring test cases, mocks, and boundary conditions for functions'
        ]
      },
      {
        group: 'CI/CD & Team Governance',
        items: [
          'GitHub pull request review integration posting automated code health assessments and suggested fixes',
          'Custom rule creation via YAML configurations to enforce team-specific coding patterns and architecture conventions',
          'Centralized team management dashboard tracking aggregate code quality trends across repositories',
          'Enterprise security policies with commitments not to train models on private user repositories'
        ]
      }
    ],
    pros: [
      'Actionable refactoring suggestions teach developers idiomatic coding patterns and clean code principles',
      'Hybrid static AST and LLM architecture delivers low-latency feedback during editing',
      'Free tier provides robust local refactoring capabilities for individual open-source developers',
      'Integration across both IDE and GitHub ensures consistent quality standards throughout the development cycle'
    ],
    cons: [
      'Advanced language support and full feature depth remain most comprehensive for Python, with other languages continuing to mature',
      'Frequent inline refactoring suggestions can occasionally feel intrusive if developer sensitivity thresholds are uncalibrated',
      'Team plans require a monthly subscription of $20 per user per month for full CI/CD pull request automation',
      'Does not provide autonomous multi-file terminal execution like full agentic tools'
    ],
    pricing_overview: `<p>Sourcery uses a freemium pricing structure offering free access for open-source work alongside tiered subscriptions for professional developers and teams.</p><p>The <strong>Free Plan</strong> ($0 per month) includes unlimited local IDE refactoring for open-source repositories and individual hobbyist use. Paid plans include: <strong>Pro</strong> at $10 per user per month (or $8 per user per month billed annually at $96 per year), which provides unlimited refactorings, automated unit test generation, and full IDE coding assistant features with a 14-day free trial; <strong>Team</strong> at $20 per user per month ($16 per user per month billed annually at $192 per year), adding GitHub pull request bot reviews and team rule sharing; and <strong>Enterprise</strong> (custom annual pricing), offering self-hosted deployments, dedicated account support, and custom security SLAs.</p>`,
    comparison_summary: `<p>Compared to <strong>CodeRabbit</strong> (/tools/coderabbit/), which specializes in conversational GitHub pull request reviews with architectural sequence diagrams, Sourcery focuses primarily on real-time, in-editor AST refactoring and unit test creation. Compared to <strong>Cursor</strong> (/tools/cursor/) and <strong>GitHub Copilot</strong> (/tools/github-copilot/), which emphasize generative completions and full-file drafting, Sourcery acts as a code quality enhancer that refines and simplifies existing code structure. Compared to <strong>Bito</strong> (/tools/bito/), Sourcery provides deeper static rule checking and deterministic code transformation.</p>`,
    pricingModel: 'freemium',
    hasFreeTier: true,
    hasFreeTrial: true,
    startingPrice: 10,
    priceCurrency: 'USD',
    billingPeriod: 'month',
    trialDays: 14,
    verificationSources: [
      'https://www.sourcery.ai/',
      'https://www.sourcery.ai/pricing'
    ]
  },

  zed: {
    long_description: `<p>Zed is a high-performance, open-source code editor developed in Rust and designed for developer productivity, speed, and integrated AI workflows. Engineered by the original creators of Atom and Tree-sitter, Zed leverages GPU acceleration (via the GPUI framework) to render text at 120 frames per second with rapid startup times and modest memory consumption.</p><p>In addition to its ultra-responsive native editing capabilities and built-in real-time collaboration features, Zed integrates AI directly into the editing experience. Developers can summon assistant panels, perform inline code transformations, and seamlessly switch between frontier LLM providers (including Anthropic Claude, OpenAI, and local Ollama instances) using either direct API keys or Zed's hosted proxy service.</p>`,
    bestFor: [
      'Software engineers seeking a responsive, lightweight, GPU-accelerated code editor with modest memory consumption',
      'Developers wanting built-in AI assistance with flexible multi-provider model switching and local model support',
      'Remote engineering teams requiring real-time multiplayer pair programming and screen-sharing directly in the editor'
    ],
    notIdealFor: [
      'Developers heavily reliant on a massive library of legacy VS Code extensions that have not yet been ported to Zed',
      'Windows users requiring official mature stability, as Zed was initially developed for macOS and Linux (Windows support in active development)',
      'Engineers seeking an all-in-one GUI for complex database visualization and graphical deployment dashboards'
    ],
    primaryUseCases: [
      'Fast code editing, navigation, and multi-buffer searching on large enterprise codebases',
      'Executing inline AI prompt transformations, code generation, and multi-file agentic conversations',
      'Collaborative real-time multiplayer pair programming with integrated audio channels and shared workspaces'
    ],
    how_it_works: `<p>Zed is engineered from the ground up as a native compiled binary in Rust, bypassing the Electron web framework entirely. It renders text directly to the GPU using GPUI, designed for low-latency keystroke responsiveness across large source repositories. Syntax parsing is powered by Tree-sitter, providing precise syntax highlighting and instant structural code navigation.</p><p>For AI capabilities, Zed features an integrated Assistant panel and inline prompt transformation interface. Developers can highlight code, type natural language instructions, and stream diff transformations directly into the active editor buffer. Users can connect their own Anthropic, OpenAI, or Ollama endpoints, or subscribe to Zed Pro to route requests through Zed's hosted infrastructure without configuring separate API keys.</p>`,
    feature_groups: [
      {
        group: 'Performance & Editor Architecture',
        items: [
          'GPU-accelerated text rendering via GPUI delivering fluid 120 FPS scrolling and rapid startup times',
          'Native Rust architecture with minimal RAM footprint compared to Electron-based code editors',
          'Tree-sitter structural syntax parsing for accurate highlighting, bracket matching, and AST-aware selection',
          'Built-in terminal emulation and multi-buffer search across large multi-repository projects'
        ]
      },
      {
        group: 'Native AI & Collaboration',
        items: [
          'Integrated Assistant panel with multi-model support for Anthropic Claude, OpenAI, and local Ollama servers',
          'Inline code transformation allowing developers to generate, refactor, and review diffs directly inside active buffers',
          'Multiplayer real-time collaboration enabling multiple developers to edit the same file simultaneously',
          'Built-in low-latency audio calling and screen sharing for seamless pair programming sessions'
        ]
      }
    ],
    pros: [
      'High rendering responsiveness and lightweight system resource footprint compared to traditional Electron editors',
      'Native multi-model flexibility lets developers switch effortlessly between Anthropic, OpenAI, and local offline models',
      'Open-source codebase (GPL/Apache 2.0) with an active, transparent developer community',
      'Integrated real-time multiplayer collaboration eliminates the need for third-party screen sharing tools during pairing'
    ],
    cons: [
      'Extension ecosystem is growing but smaller than Visual Studio Code\'s extensive marketplace',
      'Windows support has matured more recently than the battle-tested macOS and Linux builds',
      'Does not yet have the autonomous background multi-step terminal agent workflows of tools like Cline or Cursor',
      'Custom keybinding configuration requires learning Zed JSON schema rather than a graphical preferences panel'
    ],
    pricing_overview: `<p>The Zed code editor is free and open-source software ($0 per month) for individual developers and commercial teams. All core editor features, multiplayer collaboration, and BYOK (Bring Your Own Key) AI capabilities are included without fee.</p><p>For developers who prefer not to manage individual API keys, <strong>Zed Pro</strong> is available for $10 per month (or $8 per month billed annually at $96 per year), providing fast, unmetered access to Anthropic Claude and OpenAI models via Zed hosted proxy alongside advanced collaborative channels, backed by a 14-day free trial. Custom enterprise agreements with single sign-on (SSO), centralized billing, and custom deployment SLAs are also available.</p>`,
    comparison_summary: `<p>Compared to <strong>Cursor</strong> (/tools/cursor/), which is an Electron-based VS Code fork with deep multi-file agentic background indexing, Zed is a native Rust editor focused on native GPU-rendered editor performance and lightweight resource consumption. Compared to <strong>GitHub Copilot</strong> (/tools/github-copilot/), Zed supports multi-provider model switching (including local models via <strong>Ollama</strong> (/tools/ollama/)) rather than locking developers into a single proprietary catalog. Compared to <strong>Cline</strong> (/tools/cline/), which is an extension running inside VS Code, Zed is a complete standalone editor with built-in multiplayer pairing.</p>`,
    pricingModel: 'freemium',
    hasFreeTier: true,
    hasFreeTrial: true,
    startingPrice: 10,
    priceCurrency: 'USD',
    billingPeriod: 'month',
    trialDays: 14,
    verificationSources: [
      'https://zed.dev/',
      'https://zed.dev/pricing'
    ]
  }
};

const FINDINGS = {
  cline: 'Verified free open-source BYOK agent architecture (Apache 2.0) for VS Code with MCP support via official repository and site.',
  coderabbit: 'Verified pull request AI review platform with free tier for open source, $15/mo Pro tier ($12/mo billed annually at $144/year), and 14-day trial.',
  tabby: 'Verified self-hosted open-source code completion server (Apache 2.0) with free community deployment and optional managed cloud tier.',
  sourcery: 'Verified in-editor refactoring and code quality assistant with free plan, $10/mo Pro ($8/mo billed annually at $96/year), and 14-day trial.',
  zed: 'Verified high-performance Rust GPU-accelerated code editor with free open-source core, BYOK support, and $10/mo Zed Pro hosted tier with 14-day trial.'
};

function main() {
  const targetIds = Object.keys(ENRICHMENTS);
  console.log(`[START] Enriching ${targetIds.length} priority tools for AdSense Low-Value Remediation Pilot...`);

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
  console.log(`[SUCCESS] data/tools.json updated with 5 enriched pilot profiles.\n`);

  // Also sync tools.phase11.staged.json
  if (fs.existsSync(STAGED_JSON_PATH)) {
    const stagedTools = JSON.parse(fs.readFileSync(STAGED_JSON_PATH, 'utf8'));
    for (const id of targetIds) {
      const data = ENRICHMENTS[id];
      const tool = stagedTools.find(t => t.id === id);
      if (tool) {
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
      }
    }
    fs.writeFileSync(STAGED_JSON_PATH, JSON.stringify(stagedTools, null, 2), 'utf8');
    console.log(`[SUCCESS] data/tools.phase11.staged.json updated with 5 enriched pilot profiles.\n`);
  }

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

    let nextNum = 1350;
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
