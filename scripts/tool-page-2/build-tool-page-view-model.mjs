export function buildToolPageViewModel(tool, options = {}) {
  const preserveBoolean = (val) => val === undefined || val === null ? null : Boolean(val);

  // Identity
  const id = tool.id;
  const name = tool.canonicalName || tool.name;

  const identity = {
    id,
    name,
    aliases: Array.isArray(tool.aliases) ? [...tool.aliases] : [],
    category: tool.primaryCategory,
    websiteUrl: tool.website_url || tool.websiteUrl || null
  };

  // Classification
  const classification = {
    category: tool.primaryCategory,
    finderIntentIds: Array.isArray(tool.finderIntentIds) ? [...tool.finderIntentIds] : []
  };

  // Summary
  const summary = {
    shortDescription: tool.sourceSummary || tool.shortDescription || tool.description || null
  };

  // Pricing
  const hasFreeTier = tool.hasFreeTier === undefined ? null : tool.hasFreeTier;
  const hasFreeTrial = tool.hasFreeTrial === undefined ? null : tool.hasFreeTrial;
  const startingPrice = tool.startingPrice === undefined ? null : tool.startingPrice;
  const currency = tool.priceCurrency ?? tool.currency ?? null;

  let freeTierLabel = 'Free-tier status not confirmed';
  if (hasFreeTier === true) freeTierLabel = 'Free tier available';
  else if (hasFreeTier === false) freeTierLabel = 'No ongoing free tier';

  let trialLabel = 'Trial availability not confirmed';
  if (hasFreeTrial === true) trialLabel = 'Free trial available';
  else if (hasFreeTrial === false) trialLabel = 'No free trial';

  let startingPriceLabel = null;
  if (startingPrice !== null && typeof startingPrice === 'number' && currency !== null) {
    startingPriceLabel = new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(startingPrice);
  }

  const pricing = {
    model: tool.pricingModel || tool.pricing_model || null,
    hasFreeTier,
    hasFreeTrial,
    startingPrice,
    currency,
    paidPlanAvailable: preserveBoolean(tool.paidPlanAvailable),
    needsReview: preserveBoolean(tool.pricingNeedsReview),
    display: {
      freeTierLabel,
      trialLabel,
      startingPriceLabel
    }
  };

  // Platforms
  const rawPlatforms = Array.isArray(tool.platforms) ? tool.platforms : [];
  const interfaces = [];
  const operatingSystems = [];
  const technicalAccess = [];

  const osSet = new Set(['windows', 'macos', 'linux', 'ios', 'android']);
  const techSet = new Set(['api', 'cli']);

  for (const p of rawPlatforms) {
    const lp = String(p).toLowerCase();
    if (osSet.has(lp)) operatingSystems.push(lp);
    else if (techSet.has(lp)) technicalAccess.push(lp);
    else interfaces.push(lp);
  }

  const platforms = {
    interfaces,
    operatingSystems,
    technicalAccess
  };

  // Capabilities
  const apiAvailable = tool.apiAvailable === undefined ? null : tool.apiAvailable;
  const openSource = tool.openSource === undefined ? null : tool.openSource;
  const selfHosted = tool.selfHosted === undefined ? null : tool.selfHosted;

  let apiLabel = 'API availability not confirmed';
  if (apiAvailable === true) apiLabel = 'API available';
  else if (apiAvailable === false) apiLabel = 'No public API confirmed';

  let openSourceLabel = 'Open source status not confirmed';
  if (openSource === true) openSourceLabel = 'Open source';
  else if (openSource === false) openSourceLabel = 'Not open source';

  let selfHostedLabel = 'Self-hosting status not confirmed';
  if (selfHosted === true) selfHostedLabel = 'Self-hosted available';
  else if (selfHosted === false) selfHostedLabel = 'Not self-hostable';

  const capabilities = {
    apiAvailable,
    openSource,
    selfHosted,
    display: {
      apiLabel,
      openSourceLabel,
      selfHostedLabel
    }
  };

  // Audience
  const experienceLevelMap = {
    'beginner': 'Beginner',
    'intermediate': 'Intermediate',
    'advanced': 'Advanced',
    'all_levels': 'All levels'
  };

  const audience = {
    bestFor: Array.isArray(tool.bestFor) ? [...tool.bestFor] : [],
    notIdealFor: Array.isArray(tool.notIdealFor) ? [...tool.notIdealFor] : [],
    primaryUseCases: Array.isArray(tool.primaryUseCases) ? [...tool.primaryUseCases] : [],
    experienceLevel: tool.experienceLevel || null,
    display: {
      experienceLevelLabel: tool.experienceLevel ? (experienceLevelMap[tool.experienceLevel] || tool.experienceLevel) : null
    }
  };

  // Eligibility
  const eligibility = {
    directoryEligible: preserveBoolean(tool.directoryEligible),
    recommendationEligible: preserveBoolean(tool.recommendationEligible)
  };

  // Lifecycle
  const lifecycle = {
    operationalStatus: tool.operationalStatus || null,
    lifecycleStatus: tool.lifecycleStatus || null,
    successorToolId: tool.successorToolId || null,
    notice: tool.lifecycleStatus && tool.lifecycleStatus !== 'active' ? `Status: ${tool.lifecycleStatus}` : null
  };

  // Legacy Editorial Data
  const wrapLegacy = (val) => val === undefined || val === null ? null : { value: val, authority: 'legacy_editorial' };
  const editorial = {
    longDescription: wrapLegacy(tool.long_description || tool.longDescription),
    howItWorks: wrapLegacy(tool.how_it_works || tool.howItWorks),
    workflows: wrapLegacy(tool.workflows),
    featureGroups: wrapLegacy(tool.feature_groups || tool.featureGroups),
    pros: wrapLegacy(tool.pros),
    cons: wrapLegacy(tool.cons),
    pricingOverview: wrapLegacy(tool.pricing_overview || tool.pricingOverview),
    comparisonSummary: wrapLegacy(tool.comparison_summary || tool.comparisonSummary)
  };

  // Trust
  const evidenceIds = Array.isArray(tool.evidenceIds) ? [...tool.evidenceIds] : [];
  const trust = {
    evidenceIds,
    verificationSources: Array.isArray(tool.verificationSources) ? [...tool.verificationSources] : [],
    pricingNeedsReview: preserveBoolean(tool.pricingNeedsReview),
    metadataReviewRequired: preserveBoolean(tool.metadataReviewRequired),
    contentReviewRequired: preserveBoolean(tool.contentReviewRequired),
    evidenceReviewedAt: options.evidenceReviewedAt || null,
    display: {
      trustLabel: evidenceIds.length > 0 ? 'Evidence reviewed' : null
    }
  };

  // Commercial
  const commercial = {
    affiliateUrl: tool.affiliate_url || tool.affiliateUrl || null,
    hasAffiliateRelationship: !!(tool.affiliate_url || tool.affiliateUrl)
  };

  // SEO
  const seo = {
    seoEligible: preserveBoolean(tool.seoEligible),
    contentReviewRequired: preserveBoolean(tool.contentReviewRequired),
    metadataReviewRequired: preserveBoolean(tool.metadataReviewRequired),
    directoryEligible: preserveBoolean(tool.directoryEligible),
    operationalStatus: tool.operationalStatus || null,
    indexabilityDecision: null
  };

  // Schema Safe
  const schemaSafe = {
    name,
    url: tool.website_url || tool.websiteUrl || null,
    applicationCategory: tool.primaryCategory || null,
    operatingSystems: [...operatingSystems],
    descriptionCandidate: tool.sourceSummary || tool.shortDescription || tool.description || null
  };

  // Relationships
  const relationships = {
    featuredComparisons: Array.isArray(options.featuredComparisons) ? [...options.featuredComparisons] : [],
    alternatives: Array.isArray(options.alternatives) ? [...options.alternatives] : null,
    successor: tool.successorToolId || null
  };

  return {
    identity,
    classification,
    summary,
    pricing,
    platforms,
    capabilities,
    audience,
    eligibility,
    lifecycle,
    editorial,
    trust,
    commercial,
    seo,
    schemaSafe,
    relationships
  };
}
