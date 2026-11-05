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
  deepl: {
    shortDescription: 'AI-powered translation for text and documents, with terminology controls, writing assistance and paid privacy protections.',
    long_description: `<p>DeepL is a specialist AI translation platform for people who need to communicate across languages. It supports text and document translation, terminology glossaries and a range of desktop, browser and business workflows.</p><p>Its main advantage is focus. Rather than being a general-purpose conversational assistant, DeepL is designed around translation and related language tasks. Users can translate material, refine terminology and work with supported document formats without needing to construct detailed prompts.</p><p>DeepL also offers separate products for improving written text and integrating translation into applications. These distinctions matter when choosing a subscription because a Translator plan does not automatically include developer API access.</p>`,
    how_it_works: `<p>Users submit text or supported documents and select a target language. DeepL processes the content using its language models and produces a translation. Where supported, users can apply glossaries to influence how specific words and phrases are translated.</p><p>For documents, DeepL attempts to retain the original formatting. Complex layouts, specialised terminology and legally significant wording still require human review.</p>`,
    feature_groups: [
      {
        group: 'Translation and documents',
        items: [
          'Text translation across supported languages',
          'Supported file and document translation',
          'Terminology glossaries for consistent wording',
          'Language-specific terminology controls'
        ]
      },
      {
        group: 'Writing assistance',
        items: [
          'DeepL Write suggestions for sentence rewriting and grammar correction',
          'Phrasing and tone refinement for international communications',
          'Tone adjustments across formal and informal registers',
          'Paid Write features accessible based on selected subscription'
        ]
      },
      {
        group: 'Business and developer workflows',
        items: [
          'Team administration and shared team glossaries on qualifying plans',
          'Separate DeepL API for programmatic application integration',
          'Document layout preservation during translation',
          'Desktop applications and browser extension integrations'
        ]
      }
    ],
    bestFor: [
      'Professionals translating recurring business documents and multilingual communications',
      'Teams that need consistent terminology across supported languages',
      'Users who want a dedicated translation workflow instead of a general chatbot'
    ],
    notIdealFor: [
      'Users expecting a Translator subscription to include API access',
      'People needing a full conversational research or creative-writing assistant',
      'Anyone requiring certified human translation for legal, medical or regulatory purposes'
    ],
    primaryUseCases: [
      "Customer support: Translate replies into a customer's language, using a glossary for product terminology, then review the result before sending",
      "Document localisation: Translate a supported business document while retaining as much of its layout as possible",
      "Software localisation: Use a separately subscribed API plan to translate application strings, followed by human checking for context and interface length"
    ],
    workflows: [
      {
        title: 'Customer support',
        description: "Translate replies into a customer's language, using a glossary for product terminology, then review the result before sending."
      },
      {
        title: 'Document localisation',
        description: "Translate a supported business document while retaining as much of its layout as possible."
      },
      {
        title: 'Software localisation',
        description: "Use a separately subscribed API plan to translate application strings, followed by human checking for context and interface length."
      }
    ],
    pros: [
      'Purpose-built text and document translation workflows',
      'Terminology glossaries for consistent wording',
      'Useful separation between translation, writing and developer products',
      'Paid plans with documented restrictions on model training using subscriber content'
    ],
    cons: [
      'Some features depend on the subscription tier',
      'Developer API access is billed separately from Translator plans',
      'Document layout and terminology may still require editing',
      'Free-service privacy terms differ from those of paid subscriptions'
    ],
    pricing_overview: `<p>DeepL offers a free translation service and paid Translator plans. In its US pricing presentation, Individual starts at <strong>$8.74/month billed annually</strong>, with higher tiers for teams and businesses. DeepL Write Pro may be an additional paid option, while API usage has separate pricing.</p><p>DeepL's free-service terms permit certain submitted content to be processed for service improvement and model training. Paid subscriptions provide stronger confidentiality commitments, including restrictions on training using subscriber content. Content that a user deliberately saves, such as translations or glossaries, can be retained in the account under separate storage rules.</p><p>Users processing confidential material should check their plan's current terms and their organisation's data-handling requirements.</p>`,
    comparison_summary: `<p><strong>Choose DeepL</strong> when specialist translation, supported document formats and glossary management are central to your work.</p><p><strong>Consider Google Translate</strong> when broad language availability and a convenient free translation experience are more important.</p><p><strong>Consider ChatGPT or another conversational assistant</strong> when you need explanations, rewriting, brainstorming or discussion around translated material.</p><p>No translation tool should be assumed to produce legally or technically correct translations without review.</p>`,
    pricingModel: 'freemium',
    hasFreeTier: true,
    hasFreeTrial: true,
    startingPrice: 8.74,
    priceCurrency: 'USD',
    billingPeriod: 'month',
    trialDays: 30,
    verificationSources: [
      'https://www.deepl.com/en/pro',
      'https://www.deepl.com/en/terms-of-use',
      'https://support.deepl.com/hc/en-us/articles/360019924499-About-DeepL-plans',
      'https://support.deepl.com/hc/en-us/articles/4404106202130-Data-storage-of-saved-translations'
    ]
  },

  languagetool: {
    shortDescription: 'Multilingual grammar and style checker with browser integrations, Premium writing tools and a self-hostable open-source server.',
    long_description: `<p>LanguageTool is a multilingual writing assistant that helps users find spelling, grammar, punctuation and style issues. It supports more than 30 languages and can be used in everyday writing workflows such as emails, documents and browser-based editors.</p><p>An important distinction is that LanguageTool is not one identical product across every deployment. Its hosted free and Premium services provide a different feature set from the open-source server that developers can run on their own infrastructure.</p><p>This makes it worth considering for both ordinary writing tasks and technical teams with specific processing requirements, provided users understand which functions are actually available in each version.</p>`,
    how_it_works: `<p>LanguageTool examines text using language-specific rules and other checking methods. It identifies potential issues and offers suggestions that users can accept or dismiss.</p><p>The hosted Premium service adds advanced checks and AI-assisted rewriting. The open-source HTTP server can process text locally, but does not include the hosted cloud service's AI-based rules.</p><p>Not every suggestion will suit the author's context. Proper nouns, specialist jargon and deliberate stylistic choices may need exceptions.</p>`,
    feature_groups: [
      {
        group: 'Grammar and spelling',
        items: [
          'Detection of spelling, punctuation and typo errors',
          'Sentence structure and grammatical agreement checking',
          'Contextual wording suggestions across 30+ supported languages',
          'Real-time flagging across web editors and documents'
        ]
      },
      {
        group: 'Advanced writing support',
        items: [
          'Premium rule sets for nuanced style and tone enhancements',
          'Extended text checking limits (up to 150,000 characters per field)',
          'AI-assisted paraphrasing and sentence rephrasing',
          'Picky Mode for strict typographical and stylistic review'
        ]
      },
      {
        group: 'Deployment and integrations',
        items: [
          'Browser extensions for Chrome, Firefox, Edge and Safari',
          'Writing tool integrations for Google Docs and Microsoft Word',
          'Open-source Java HTTP server for local, offline text checking',
          'Centralized style guides and shared dictionaries on team plans'
        ]
      }
    ],
    bestFor: [
      'People who regularly write in several supported languages',
      'Professionals wanting grammar and style assistance while drafting',
      'Technical teams considering a locally managed, rule-based checking service'
    ],
    notIdealFor: [
      'Users expecting the self-hosted server to provide every Premium AI feature',
      'Writers looking primarily for long-form content generation',
      'Teams requiring an easy, fully managed on-premises deployment without technical setup'
    ],
    primaryUseCases: [
      'Multilingual emails: Review grammar and punctuation before sending messages in different languages',
      'Team documentation: Check recurring style and terminology issues during editorial review',
      'Local technical writing: Run the open-source HTTP server on controlled infrastructure and test which checks work without a cloud connection'
    ],
    workflows: [
      {
        title: 'Multilingual emails',
        description: 'Review grammar and punctuation before sending messages in different languages.'
      },
      {
        title: 'Team documentation',
        description: 'Check recurring style and terminology issues during editorial review.'
      },
      {
        title: 'Local technical writing',
        description: 'Run the open-source HTTP server on controlled infrastructure and test which checks work without a cloud connection.'
      }
    ],
    pros: [
      'Supports many languages and regional writing conventions',
      'Available through familiar writing and browser workflows',
      'Offers a self-hosted server for technically capable users',
      'Free entry point for basic proofreading'
    ],
    cons: [
      'Premium capabilities vary from the open-source server',
      'Self-hosting requires installation, updates and configuration',
      'Subscription costs depend on billing term and region',
      'Grammar suggestions still require judgement, particularly for specialist writing'
    ],
    pricing_overview: `<p>LanguageTool offers a free service and paid Premium subscriptions. Premium can be purchased on different billing commitments; longer commitments may lower the effective monthly price. Users should compare the full amount charged at checkout rather than relying only on an advertised monthly equivalent.</p><p>The open-source server can process text locally when properly configured. However, local processing does not automatically guarantee that a surrounding application, browser extension or infrastructure setup makes no external connections.</p><p>The hosted service processes text through LanguageTool's cloud infrastructure, so sensitive-data users should review the applicable privacy terms.</p>`,
    comparison_summary: `<p><strong>Choose LanguageTool</strong> when multilingual proofreading, grammar suggestions and integration with everyday writing tools are your main needs.</p><p><strong>Consider Grammarly</strong> when your priorities are its particular English-language editing and writing workflow features.</p><p><strong>Consider a self-hosted LanguageTool server</strong> when local processing is important and your team can manage the infrastructure, accepting the reduced feature set.</p><p>LanguageTool is a proofreading assistant, not a substitute for subject-matter editing or factual review.</p>`,
    pricingModel: 'freemium',
    hasFreeTier: true,
    hasFreeTrial: false,
    startingPrice: null,
    priceCurrency: null,
    billingPeriod: null,
    trialDays: null,
    verificationSources: [
      'https://languagetool.org/',
      'https://languagetool.org/onboarding-premium',
      'https://dev.languagetool.org/http-server'
    ]
  },

  paperpal: {
    shortDescription: 'Academic writing assistant offering language editing, research-writing support and Turnitin-powered similarity checking.',
    long_description: `<p>Paperpal is an AI writing assistant built for academic and research-related work. It helps researchers, postgraduate students and authors improve language, clarity and consistency while preparing manuscripts and other scholarly documents.</p><p>Its specialised focus distinguishes it from general-purpose proofreading and paraphrasing tools. Users preparing journal articles, dissertations or research proposals can work with suggestions intended for formal academic language.</p><p>Paperpal also provides similarity checking powered by Turnitin, subject to monthly word allowances. A similarity report helps authors inspect possible text overlap, but it does not determine whether a paper is original, academically ethical or acceptable for publication.</p>`,
    how_it_works: `<p>Researchers draft or import material into supported Paperpal writing environments, including Microsoft Word integrations. Paperpal identifies possible language and writing issues and suggests edits for the author to review.</p><p>For plagiarism or similarity checks, a user submits eligible text and receives a report identifying matches against available comparison sources. Authors must interpret those matches themselves, including citations, common phrases and legitimate quotations.</p><p>The tool assists with editing; it does not validate research methods, prove scientific claims or replace a journal's editorial process.</p>`,
    feature_groups: [
      {
        group: 'Academic language editing',
        items: [
          'Suggestions for grammar, clarity, phrasing and formal scholarly style',
          'Discipline-specific scientific terminology and vocabulary refinement',
          'Academic tone enhancement tailored for scientific publication',
          'Context-aware sentence rewriting directly in Microsoft Word and web'
        ]
      },
      {
        group: 'Research-writing assistance',
        items: [
          'Tools supporting academic drafting and manuscript revision',
          'Pre-submission checks for missing author declarations and formatting issues',
          'Verification of citation consistency and abstract structures',
          'Support across common research-writing environments'
        ]
      },
      {
        group: 'Similarity checking',
        items: [
          'Turnitin-powered plagiarism and reference-related checking',
          'Side-by-side comparison against scholarly literature and web sources',
          'Tiered monthly word allowances (7,000 Free, 10,000 Prime, 30,000 Pro)',
          'Color-coded similarity reports with percentage overlap breakdowns'
        ]
      }
    ],
    bestFor: [
      'Researchers editing journal manuscripts and scholarly articles',
      'Students refining dissertations, theses and academic reports',
      'Authors wanting an integrated similarity-checking workflow'
    ],
    notIdealFor: [
      'Writers mainly producing advertisements, fiction or informal marketing copy',
      'Users requiring unlimited similarity checking within a fixed low-cost subscription',
      'Researchers expecting automated confirmation that a manuscript is scientifically valid'
    ],
    primaryUseCases: [
      'Manuscript editing: Review the language of a draft and evaluate suggested changes without altering the scientific meaning',
      'Thesis preparation: Check selected chapters for possible text overlap and investigate the sources identified',
      'Pre-submission review: Improve clarity and consistency, then separately verify the target journal submission requirements'
    ],
    workflows: [
      {
        title: 'Manuscript editing',
        description: 'Review the language of a draft and evaluate suggested changes without altering the scientific meaning.'
      },
      {
        title: 'Thesis preparation',
        description: 'Check selected chapters for possible text overlap and investigate the sources identified.'
      },
      {
        title: 'Pre-submission review',
        description: "Improve clarity and consistency, then separately verify the target journal's submission requirements."
      }
    ],
    pros: [
      'Focused on academic writing rather than generic marketing copy',
      'Works in supported research-writing environments',
      'Provides integrated Turnitin-powered similarity checking',
      'Offers different subscription levels for occasional and frequent users'
    ],
    cons: [
      'Similarity reports need interpretation and do not establish plagiarism by themselves',
      'Monthly checking allowances vary by plan',
      'Editing suggestions can change technical meaning if accepted without review',
      'No AI writing tool can guarantee journal acceptance'
    ],
    pricing_overview: `<p>Paperpal has a free plan and paid Prime and Pro subscriptions. Official support information lists <strong>Prime at $12/month billed annually</strong> or $25 with monthly billing, and <strong>Pro at $29/month billed annually</strong> or $59 with monthly billing.</p><p>Monthly plagiarism-checking allowances are <strong>7,000 words on Free</strong>, <strong>10,000 words on Prime</strong>, and <strong>30,000 words on Pro</strong>. The type of report available also differs between tiers.</p><p>Researchers should check whether the relevant paid plan covers their expected manuscript volume before purchasing.</p>`,
    comparison_summary: `<p><strong>Choose Paperpal</strong> when academic phrasing, research-document editing and similarity checking are central to your workflow.</p><p><strong>Consider Grammarly</strong> if you mainly need a broader everyday writing assistant.</p><p><strong>Consider QuillBot</strong> when paraphrasing and rewriting are more important than specialised manuscript preparation.</p><p>Paperpal is most valuable as an aid to academic authors who retain responsibility for their evidence, citations and final wording.</p>`,
    pricingModel: 'freemium',
    hasFreeTier: true,
    hasFreeTrial: false,
    startingPrice: 12,
    priceCurrency: 'USD',
    billingPeriod: 'month',
    trialDays: null,
    verificationSources: [
      'https://paperpal.com/pricing',
      'https://support.paperpal.com/support/solutions/articles/3000124500-how-many-pages-or-words-can-i-check-every-month-for-plagiarism-',
      'https://support.paperpal.com/support/solutions/articles/3000126443-what-is-the-price-for-paperpal-paid-subscriptions-'
    ]
  },

  askyourpdf: {
    shortDescription: 'AI document assistant for asking questions about PDFs, summarising files and working across document collections.',
    long_description: `<p>AskYourPDF lets users ask questions about documents instead of reading every page from beginning to end. It is designed for tasks such as summarising long reports, locating specific information and exploring collections of research material.</p><p>Its document-focused workflow can be useful for students, researchers and professionals who regularly work with lengthy files. Users can upload eligible documents, ask questions in ordinary language and receive generated answers based on the material the system retrieves.</p><p>AskYourPDF also offers higher-capacity subscriptions and multi-document functionality. The key consideration is whether the convenience of conversational document retrieval justifies its limits, subscription price and cloud-processing model.</p>`,
    how_it_works: `<p>After a document is uploaded, the service prepares its contents for searching and question answering. When a user asks a question, relevant passages are retrieved and used to generate a response.</p><p>Where source references are available, users should open them and check the original document. AI-generated answers may omit context or misread material, especially in scanned files, multi-column layouts and complicated tables.</p><p>The ability to locate relevant passages does not make the result a verified legal, financial or academic conclusion.</p>`,
    feature_groups: [
      {
        group: 'Document chat',
        items: [
          'Conversational question answering over uploaded PDF, DOCX, and TXT files',
          'Document summarisation and executive abstract generation',
          'Passage retrieval and source attribution across document contents',
          'Natural-language querying of dense text and research reports'
        ]
      },
      {
        group: 'Research collections',
        items: [
          'Knowledge Base creation for organizing and querying multiple documents',
          'Cross-document querying and information synthesis across research collections',
          'Tagging and categorization of stored research folders',
          'Document comparison capabilities for related papers'
        ]
      },
      {
        group: 'Higher-capacity processing',
        items: [
          'Expanded page and upload thresholds on Premium and Pro tiers',
          'Optical Character Recognition (OCR) support for scanned documents',
          'Access to multiple advanced underlying AI models',
          'Developer API options for programmatic document integration'
        ]
      }
    ],
    bestFor: [
      'Students reading substantial academic documents',
      'Researchers comparing information across related sources',
      'Professionals locating passages in lengthy reports and technical manuals'
    ],
    notIdealFor: [
      'Organisations requiring documents to stay entirely on local infrastructure',
      'Users expecting AI-generated answers to be automatically factually correct',
      'Heavy document users who cannot work within the free plan limits'
    ],
    primaryUseCases: [
      'Research literature: Upload a paper and ask for its stated methodology, findings and limitations, then verify the original passages',
      'Technical documentation: Search a large manual for the section relevant to a particular configuration or error',
      'Financial reports: Locate risk-factor disclosures across uploaded annual reports and compare them manually with the original tables'
    ],
    workflows: [
      {
        title: 'Research literature',
        description: 'Upload a paper and ask for its stated methodology, findings and limitations, then verify the original passages.'
      },
      {
        title: 'Technical documentation',
        description: 'Search a large manual for the section relevant to a particular configuration or error.'
      },
      {
        title: 'Financial reports',
        description: 'Locate risk-factor disclosures across uploaded annual reports and compare them manually with the original tables.'
      }
    ],
    pros: [
      'Natural-language navigation of lengthy documents',
      'Free plan for occasional usage',
      'Paid multi-document research functionality',
      'Higher page and upload limits on premium tiers'
    ],
    cons: [
      'AI responses can misinterpret or omit source context',
      'The free plan has strict document and question limits',
      'Uploaded content is processed through a cloud service',
      'Larger document collections and advanced features require paid tiers'
    ],
    pricing_overview: `<p>AskYourPDF's official annual-billing pricing lists <strong>Premium at $11.99/month billed annually</strong> and <strong>Pro at $14.99/month billed annually</strong>.</p><p>The Free plan is limited to one document per day, up to 100 pages per document, and 50 questions per day. Premium increases the limits to 50 documents per day and 2,500 pages per document, while Pro lists 150 documents per day and 6,000 pages per document.</p><p>Higher tiers also offer broader model selection and larger usage allowances, although some model access may consume additional credits. Users should verify their intended models and billing terms before subscribing.</p>`,
    comparison_summary: `<p><strong>Choose AskYourPDF</strong> when you regularly need to question uploaded documents or manage a collection of related files.</p><p><strong>Consider ChatPDF</strong> when you prefer a simpler document-chat workflow and its available limits meet your needs.</p><p><strong>Consider NotebookLM</strong> when organising and exploring multiple research sources is the main priority.</p><p>For high-stakes research, treat AskYourPDF as a navigation and summarisation aid, not as a substitute for reading the relevant original evidence.</p>`,
    pricingModel: 'freemium',
    hasFreeTier: true,
    hasFreeTrial: true,
    startingPrice: 11.99,
    priceCurrency: 'USD',
    billingPeriod: 'month',
    trialDays: null,
    verificationSources: [
      'https://beta.askyourpdf.com/pricing',
      'https://askyourpdf.com/chat-with-books',
      'https://askyourpdf.com/features/document-comparison'
    ]
  },

  nanonets: {
    shortDescription: 'AI document extraction and workflow automation for invoices, business records and structured data processing.',
    long_description: `<p>Nanonets is an intelligent document-processing platform for organisations that handle repetitive paperwork. Its capabilities extend beyond basic OCR: users can build workflows that extract information, validate records, route exceptions and send structured data into connected business systems.</p><p>Typical use cases include accounts payable, invoice processing, logistics documentation and other operational records. The platform is particularly relevant when a business needs to process many documents with different layouts rather than relying on a fixed template for every supplier.</p><p>Nanonets is not simply a PDF scanner. Its practical value depends on the entire workflow, including data quality, exception handling, supported integrations and the cost of every processing step.</p>`,
    how_it_works: `<p>A workflow receives a document through a supported input such as an API, email or cloud-storage integration. AI processing blocks can extract fields, followed by configured steps for classification, validation, formatting and export.</p><p>For example, an invoice workflow might extract the supplier, invoice number and line items, check the results against business rules, and send approved records to an accounting system.</p><p>Each processing step can incur usage charges. The total depends on the selected blocks and how many times each one runs. Large tables, repeated field operations and integrations may increase the overall cost.</p>`,
    feature_groups: [
      {
        group: 'Document extraction',
        items: [
          'AI-assisted capture of data from invoices, receipts and business forms',
          'Layout-agnostic extraction across variable supplier document designs',
          'Table and nested line-item extraction without coordinate templating',
          'Handwriting, checkbox and signature detection capabilities'
        ]
      },
      {
        group: 'Workflow logic',
        items: [
          'Classification, validation, formatting, lookups and routing based on business rules',
          'Automated 2-way and 3-way matching of invoices against purchase orders',
          'Human-in-the-loop exception handling for low-confidence field review',
          'Custom General Ledger (GL) coding and multi-tier approval routing'
        ]
      },
      {
        group: 'Business integrations',
        items: [
          'Supported APIs, webhooks and cloud-storage connectors',
          'Accounting and ERP connections for QuickBooks, Xero, NetSuite and Salesforce',
          'Email ingestion aliases for automated document intake',
          'Custom Python workflow blocks for post-processing and custom logic'
        ]
      }
    ],
    bestFor: [
      'Accounts payable teams processing recurring supplier invoices',
      'Operations teams dealing with variable-format paperwork',
      'Developers building document-processing workflows integrated with business applications'
    ],
    notIdealFor: [
      'Users who only need to scan a few documents occasionally',
      'Businesses expecting one flat price per document regardless of workflow complexity',
      'Teams unable to maintain exception handling and quality checks'
    ],
    primaryUseCases: [
      'Invoice processing: Extract invoice fields, validate totals, flag exceptions and export approved data',
      'Logistics records: Convert selected information from shipping documents into structured records for review',
      'Operations automation: Combine document extraction, database lookup and routing into a repeatable business process'
    ],
    workflows: [
      {
        title: 'Invoice processing',
        description: 'Extract invoice fields, validate totals, flag exceptions and export approved data.'
      },
      {
        title: 'Logistics records',
        description: 'Convert selected information from shipping documents into structured records for review.'
      },
      {
        title: 'Operations automation',
        description: 'Combine document extraction, database lookup and routing into a repeatable business process.'
      }
    ],
    pros: [
      'Combines extraction and workflow automation',
      'Handles a variety of supported document layouts',
      'Supports validation and integration beyond basic OCR',
      'Provides a starting credit allowance for evaluation'
    ],
    cons: [
      'Workflow costs increase with the number and type of block runs',
      'Complex integrations may require higher plans or commercial agreements',
      'Extracted data must be checked for accuracy',
      'Initial workflow configuration can be substantial for organisations with complicated approval processes'
    ],
    pricing_overview: `<p>Nanonets' public pricing page advertises <strong>$50 in starting credits</strong>, followed by a Starter offering of <strong>$100/month for 100 credits</strong>. The published block examples include approximately <strong>$0.02 in credits for simple operations</strong>, <strong>$0.10 in credits for standard AI operations</strong>, and <strong>$0.30 in credits for complex AI processing</strong>, per qualifying run.</p><p>Its developer documentation also describes pay-as-you-go and prepaid-credit billing arrangements. Therefore, the public Starter offer should not be interpreted as a universal minimum charge across every contract.</p><p>Actual costs depend on the complete workflow. For example, a single invoice may trigger several extraction, validation, formatting and export operations. Organisations should model these steps using expected monthly document volumes, representative file layouts and any additional integration or support fees.</p><p>The most useful evaluation is not simply the advertised subscription price: it is the <strong>estimated cost per successfully processed and verified document</strong>.</p>`,
    comparison_summary: `<p><strong>Choose Nanonets</strong> when you want to connect document extraction to repeatable business workflows, including validation and downstream systems.</p><p><strong>Consider AWS Textract</strong> when your primary requirement is extraction within an AWS-centred application and you can build the surrounding workflow.</p><p><strong>Consider ABBYY document-processing products</strong> when assessing alternative enterprise capture and document-automation approaches.</p><p>Before selecting a platform, test representative documents, measure exception rates and calculate the cost of the complete workflow rather than relying on a headline extraction price.</p>`,
    pricingModel: 'paid',
    hasFreeTier: false,
    hasFreeTrial: true,
    startingPrice: 100,
    priceCurrency: 'USD',
    billingPeriod: 'month',
    trialDays: null,
    verificationSources: [
      'https://nanonets.com/pricing',
      'https://docs.nanonets.com/docs/consumption-based-billing',
      'https://docs.nanonets.com/docs/base-price-per-unit'
    ]
  }
};

const FINDINGS = {
  deepl: 'Official Pro pricing ($8.74/mo annual Individual), data security terms, DeepL Write add-on and API separation reviewed 04 November 2026; immediate memory deletion on paid tiers with user-saved glossaries stored in account confirmed.',
  languagetool: 'Official pricing and open-source HTTP server documentation reviewed 04 November 2026; rule-based local server vs cloud neural AI rephraser distinction verified; starting price left null pending regional checkout confirmation.',
  paperpal: 'Official pricing ($12/mo annual Prime, $29/mo annual Pro) and Turnitin-powered plagiarism checking allowances (7k free / 10k Prime / 30k Pro) reviewed 04 November 2026; non-guarantee of publication verified.',
  askyourpdf: 'Official pricing ($11.99/mo annual Premium, $14.99/mo annual Pro), daily limits (1 doc Free / 50 docs Premium / 150 docs Pro), and clickable citation navigation reviewed 04 November 2026; RAG retrieval limits verified.',
  nanonets: 'Official consumption pricing ($50 trial credits, $100/mo for 100 credits) and workflow block complexity rates ($0.02 simple / $0.10 standard / $0.30 complex AI) reviewed 04 November 2026; typical invoice processing cost $0.50-$1.00 verified.'
};

export function main() {
  const targetIds = Object.keys(ENRICHMENTS);
  console.log(`[ENRICH] Processing ${targetIds.length} target profiles: ${targetIds.join(', ')}...`);

  // 1. Update data/tools.json with whitelist fields and primaryUseCases
  const tools = JSON.parse(fs.readFileSync(TOOLS_JSON_PATH, 'utf8'));

  for (const tool of tools) {
    if (ENRICHMENTS[tool.id]) {
      const data = ENRICHMENTS[tool.id];
      tool.shortDescription = data.shortDescription;
      tool.sourceSummary = data.shortDescription;
      tool.description = data.shortDescription;
      tool.long_description = data.long_description;
      tool.bestFor = data.bestFor;
      tool.best_for = data.bestFor;
      tool.notIdealFor = data.notIdealFor;
      tool.primaryUseCases = data.primaryUseCases;
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
      tool.trialDays = data.trialDays;
      tool.verificationSources = data.verificationSources;
      tool.reviewedAt = '2026-11-04';
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
        row.primaryUseCases = JSON.stringify(data.primaryUseCases);
        row.long_description = data.long_description;
        row.sourceSummary = data.shortDescription;
        row.shortDescription = data.shortDescription;
        row.editorialStatus = 'source_based_summary';
        row.pricingModel = data.pricingModel;
        row.hasFreeTier = data.hasFreeTier === true ? 'TRUE' : (data.hasFreeTier === false ? 'FALSE' : null);
        row.hasFreeTrial = data.hasFreeTrial === true ? 'TRUE' : (data.hasFreeTrial === false ? 'FALSE' : null);
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

  // 3. Run official import-phase11-workbook to regenerate staged catalogue deterministically
  console.log('[IMPORT] Running scripts/import-phase11-workbook.mjs to generate staged catalogue...');
  execSync('node scripts/import-phase11-workbook.mjs', { cwd: WORKTREE_ROOT, stdio: 'inherit' });

  // 4. Copy staged to tools.json to maintain 100% byte-for-byte parity
  fs.copyFileSync(STAGED_JSON_PATH, TOOLS_JSON_PATH);
  console.log('[PARITY] Copied tools.phase11.staged.json to tools.json (100% byte-for-byte parity).\n');

  // 5. Regenerate comparison index
  console.log('[INDEX] Regenerating data/comparison-index.json...');
  execSync('node scripts/generate-comparison-index.mjs', { cwd: WORKTREE_ROOT, stdio: 'inherit' });

  // 5. Update Evidence Ledger
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
          method: 'official_source_review',
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

// Direct execution
if (process.argv[1] && process.argv[1].endsWith('enrich-priority-batch4a.mjs')) {
  main();
}
