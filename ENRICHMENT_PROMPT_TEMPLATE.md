# Tool Data Enrichment Prompt Template

## Purpose
This template helps you enrich tool data for the WhichAIPick site using an AI assistant (ChatGPT, Claude, etc.). The enrichment process adds descriptions and pricing information to the tool database.

## Input Format

You will receive an `enrichment-batch.json` file containing tools in this format:

```json
[
  {
    "id": "tool-id",
    "name": "Tool Name",
    "website_url": "https://example.com",
    "category": "Category"
  },
  ...
]
```

## Output Requirements

### Descriptions CSV Format
```
id,short_description
tool-id,Description text here
```

### Pricing CSV Format
```
id,has_free_tier,starting_price,price_currency,pricing_model,notes
tool-id,yes,20,USD,subscription,Plus plan starts at $20/mo
```

## STRICT RULES

### For Descriptions:
1. **Maximum 160 characters** (hard limit)
2. **Neutral and factual** — no marketing language or claims
3. **Do NOT claim you tested the tool** — use publicly known information only
4. **Format:** `[What it does] for [use case/audience]` OR `[Platform/tool] for [purpose]`
5. **If uncertain:** Leave the row blank or description empty

### For Pricing:
1. **has_free_tier:** 
   - `yes` — ONLY if explicitly stated on website
   - `no` — if pricing page shows no free option
   - `unknown` — if uncertain or pricing is unclear
   
2. **starting_price:** 
   - Lowest paid price (numeric only, no symbols)
   - Leave blank if unknown or only enterprise pricing
   
3. **price_currency:** 
   - `USD`, `EUR`, `GBP`, etc.
   - Leave blank if unknown
   
4. **pricing_model:**
   - `subscription` — recurring monthly/annual
   - `one-time` — single purchase
   - `usage-based` — pay per API call/usage
   - `unknown` — if unclear
   
5. **notes:**
   - Brief context (e.g., "Starter plan" or "API pricing only")
   - Leave blank if not needed

6. **If pricing is unclear, enterprise-only, or requires contact sales:**
   - Set `has_free_tier` to `unknown`
   - Leave `starting_price` blank
   - Set `pricing_model` to `unknown`

## Example Prompt

```
You are enriching tool data for a neutral comparison site. Using the tools in the attached enrichment-batch.json:

1. For each tool, provide:
   - A factual description (max 160 chars)
   - Pricing information (only what's clearly stated)

2. Rules:
   - Descriptions must be neutral, no claims about testing
   - Pricing must be accurate or marked "unknown"
   - Free tier only "yes" if explicitly offered
   - If uncertain, use "unknown" or leave blank

3. Output two CSV blocks:

DESCRIPTIONS:
id,short_description
[tool rows]

PRICING:
id,has_free_tier,starting_price,price_currency,pricing_model,notes
[tool rows]

Enrichment batch:
[paste enrichment-batch.json content]
```

## Usage Workflow

1. Run: `node scripts/export-enrichment-batch.mjs`
2. Copy contents of `data/enrichment-batch.json`
3. Paste into ChatGPT/Claude with the prompt above
4. Review output for accuracy
5. Save CSV blocks to temporary files
6. Use append scripts to merge:
   ```bash
   node scripts/append-descriptions.mjs '[{...output...}]'
   node scripts/append-pricing.mjs '[{...output...}]'
   ```

## Quality Checks

Before committing enriched data:
- [ ] All descriptions under 160 characters
- [ ] No marketing language or exaggerations
- [ ] Pricing marked "unknown" when unsure
- [ ] Free tier only "yes" if explicitly stated
- [ ] No invented claims about tool testing
