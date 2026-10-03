import https from 'https';

const checkUrl = (url, expectRedirectTo, expectStatus) => {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          url,
          status: res.statusCode,
          headers: res.headers,
          body,
          location: res.headers.location
        });
      });
    }).on('error', (err) => resolve({ url, error: err }));
  });
};

const run = async () => {
  const pages = [
    'https://whichaipick.com/',
    'https://whichaipick.com/tools/',
    'https://whichaipick.com/category/development/',
    'https://whichaipick.com/tools/chatgpt/',
    'https://whichaipick.com/alternatives/chatgpt/',
    'https://whichaipick.com/compare.html',
    'https://whichaipick.com/best-ai-tools/'
  ];

  for (const p of pages) {
    const res = await checkUrl(p);
    const hasRobotsHeader = res.headers['x-robots-tag']?.includes('noindex');
    const hasRobotsMeta = res.body.toLowerCase().includes('noindex');
    console.log(`[STATUS] ${p}: ${res.status}`);
    if (hasRobotsHeader) console.log(`[WARNING] ${p} has X-Robots-Tag: noindex`);
    if (hasRobotsMeta) console.log(`[WARNING] ${p} has <meta robots noindex>`);
  }

  const activeCategories = [
    '/category/development/', '/category/marketing/', '/category/education/',
    '/category/business/', '/category/automation/', '/category/design/',
    '/category/video-audio/', '/category/content-creation/', '/category/productivity/',
    '/category/research/'
  ];

  for (const cat of activeCategories) {
    const res = await checkUrl(`https://whichaipick.com${cat}`);
    console.log(`[CAT] ${cat}: ${res.status}`);
  }

  const redirectCats = [
    '/category/sales/', '/category/customer-support/'
  ];
  for (const cat of redirectCats) {
    const res = await checkUrl(`https://whichaipick.com${cat}`);
    console.log(`[REDIRECT] ${cat}: ${res.status} -> ${res.location}`);
  }

  const badCats = ['/category/uncategorized/', '/category/coding/'];
  for (const cat of badCats) {
    const res = await checkUrl(`https://whichaipick.com${cat}`);
    console.log(`[404 CAT] ${cat}: ${res.status}`);
  }

  const legacyTools = [
    'bing-chat', 'breeze-ai', 'framer-ai', 'replit-ai', 'perplexity', 'canva', 'pika-labs', 'fig', 'dall-e-3'
  ];
  for (const tool of legacyTools) {
    const res = await checkUrl(`https://whichaipick.com/tools/${tool}/`);
    console.log(`[LEGACY TOOL] ${tool}: ${res.status} -> ${res.location}`);
  }

  const retiredTools = [
    'bildr', 'diagram', 'memorable', 'phind', 'quizlet-q-chat', 'relay', 'sora', 'supertone', 'tome', 'woebot', 'youper'
  ];
  for (const tool of retiredTools) {
    const res = await checkUrl(`https://whichaipick.com/tools/${tool}/`);
    console.log(`[RETIRED] ${tool}: ${res.status} (Cache: ${res.headers['cf-cache-status']} Age: ${res.headers['age']})`);
  }

  const specificPages = [
    '/find', '/alternatives/perplexity/', '/compare/sora-vs-runway/'
  ];
  for (const page of specificPages) {
    const res = await checkUrl(`https://whichaipick.com${page}`);
    console.log(`[SPECIFIC] ${page}: ${res.status}`);
  }
};

run();
