# COMPARISON P0 RESEARCH NOTES
Research Checked: 2026-10-03

## 1. ChatGPT vs Claude
**Canonical Tools:** chatgpt, claude
**Research Questions:** Which has better context window? Artifacts vs ADA? Voice mode?
**Official Sources:** openai.com/chatgpt/pricing, anthropic.com/pricing, anthropic.com/news/artifacts
**Key Findings:** Claude has Artifacts, better coding UI, 200k context. ChatGPT has Advanced Voice, native image generation (DALL-E 3), Advanced Data Analysis.
**Recommendation:** READY FOR 6B.2B

## 2. ChatGPT vs Gemini
**Canonical Tools:** chatgpt, google-gemini
**Research Questions:** Ecosystem integrations? Multimodal strength?
**Official Sources:** gemini.google.com/advanced, openai.com/chatgpt/pricing
**Key Findings:** Gemini is deeply integrated into Google Workspace (Docs, Gmail, Drive). ChatGPT has broader standalone multimodal features. Both have 2M+ context (Gemini 1.5 Pro).
**Recommendation:** READY FOR 6B.2B

## 3. ChatGPT vs Perplexity
**Canonical Tools:** chatgpt, perplexity-ai
**Research Questions:** Assistant vs Search Engine?
**Official Sources:** perplexity.ai/pro
**Key Findings:** Perplexity is a citation-first answer engine focused on real-time web research. ChatGPT is a general-purpose assistant. Perplexity Pro lets users choose models (GPT-4o, Claude 3.5 Sonnet).
**Recommendation:** READY FOR 6B.2B

## 4. Cursor vs GitHub Copilot
**Canonical Tools:** cursor, github-copilot
**Research Questions:** IDE integration vs Fork? Multi-file changes?
**Official Sources:** cursor.com/pricing, github.com/features/copilot
**Key Findings:** Cursor is a VS Code fork with deep agentic coding (Composer) and multi-file edits. GitHub Copilot is an extension available in multiple IDEs, strongly tied to GitHub Enterprise features.
**Recommendation:** READY FOR 6B.2B

## 5. Replit vs Lovable
**Canonical Tools:** replit, lovable
**Research Questions:** Code-first IDE vs prompt-to-app?
**Official Sources:** replit.com/pricing, lovable.dev/pricing
**Key Findings:** Replit is a cloud IDE with AI features (Replit AI/Agent), targeting developers and learners. Lovable is a pure prompt-to-app visual builder (using Supabase) targeted at fast prototyping and non-technical founders.
**Recommendation:** READY FOR 6B.2B

## 6. Lovable vs Bolt
**Canonical Tools:** lovable, bolt
**Research Questions:** Frameworks? Deployment?
**Official Sources:** bolt.new, lovable.dev
**Key Findings:** Bolt.new runs entirely in the browser using WebContainers (StackBlitz), great for full-stack Node.js apps. Lovable integrates natively with Supabase and focuses on React/Vite UI generation.
**Recommendation:** READY FOR 6B.2B

## 7. Midjourney vs Leonardo AI
**Canonical Tools:** midjourney, leonardo-ai
**Research Questions:** Discord vs Web? Style control?
**Official Sources:** midjourney.com, leonardo.ai
**Key Findings:** Midjourney now has a web alpha/interface (not Discord only). Leonardo offers highly granular workflow tools (Canvas, Realtime generation, fine-tuned models) and a free tier. Midjourney relies on subscription.
**Recommendation:** READY FOR 6B.2B

## 8. Midjourney vs ChatGPT Images
**Canonical Tools:** midjourney, chatgpt
**Research Questions:** Prompt adherence vs aesthetics?
**Official Sources:** openai.com/dall-e-3
**Key Findings:** ChatGPT Images (DALL-E 3) excels at prompt adherence and text rendering. Midjourney leads in photorealism, artistic aesthetics, and stylistic control (style references).
**Recommendation:** READY FOR 6B.2B

---

## Existing Comparison Audit

### 1. ChatGPT vs Claude
* **Title:** "ChatGPT vs Claude: Compare Features & Pricing | WhichAIPick" -> CURRENT + SUPPORTED
* **Meta:** "A factual, side-by-side comparison of ChatGPT and Claude. Compare context windows, coding capabilities, writing styles, and pricing models to find the right AI for you." -> CURRENT + SUPPORTED
* **editorialGuidance:** "ChatGPT and Claude are the two leading frontier models." -> TOO BROAD
* **editorialGuidance:** "ChatGPT generally excels in multimodal tasks (voice, image generation) and internet browsing, making it a stronger general-purpose assistant." -> TOO BROAD ("strongest general-purpose")
* **editorialGuidance:** "Claude, particularly the Sonnet model, is widely preferred by developers for its superior coding abilities, large context window, and more natural, less 'robotic' writing style." -> UNSUPPORTED ("superior coding abilities" is too absolute, prefer "strong coding UI with Artifacts").

### 2. Cursor vs GitHub Copilot
* **Title:** "Cursor vs GitHub Copilot: Which AI Coding Assistant is Better?" -> UNSUPPORTED ("Better?" implies subjective winner).
* **Meta:** "Compare Cursor and GitHub Copilot. See which AI coding tool offers better context awareness, agentic workflows, and value for money." -> CURRENT + SUPPORTED
* **editorialGuidance:** "GitHub Copilot is the enterprise standard, offering seamless integration across multiple IDEs and strong corporate compliance." -> CURRENT + SUPPORTED
* **editorialGuidance:** "Cursor is an entirely separate AI-first IDE (forked from VS Code) that offers deeper 'agentic' workflows, meaning it can autonomously plan and execute multi-file changes much more effectively than Copilot's current autocomplete and chat features." -> OUTDATED (Copilot is no longer just autocomplete and chat; Copilot Workspace/Agents offer multi-file capabilities, though Cursor is arguably still more agentic natively. "much more effectively" is subjective).

### 3. Midjourney vs Leonardo AI
* **Title:** "Midjourney vs Leonardo AI: Image Generator Comparison" -> CURRENT + SUPPORTED
* **Meta:** "Compare Midjourney and Leonardo AI. Evaluate image quality, user interface, free tiers, and advanced control features like ControlNet." -> CURRENT + SUPPORTED
* **editorialGuidance:** "Midjourney is widely considered the gold standard for artistic and photorealistic image generation, but it requires using Discord and lacks a free tier." -> OUTDATED ("requires using Discord" is false; Web interface exists).
* **editorialGuidance:** "Leonardo AI offers a much more intuitive web interface, generous free daily tokens, and advanced features like granular style control and integrated canvas editing, making it highly versatile for creative workflows." -> CURRENT + SUPPORTED (Free tier is generous, canvas editing is real).
