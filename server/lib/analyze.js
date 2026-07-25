const cheerio = require('cheerio');

const FETCH_TIMEOUT_MS = 8000;
// Stripped before text extraction so word count reflects content, not boilerplate.
const NOISE_SELECTORS = ['script', 'style', 'noscript', 'nav', 'footer'];

async function analyzePage(url) {
  const start = Date.now();
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { 'User-Agent': 'PagePulse/1.0 (+https://digitalheroesco.com)' },
  });
  const responseTimeMs = Date.now() - start;
  const contentType = response.headers.get('content-type') || '';
  const html = await response.text();

  const $ = cheerio.load(html);
  NOISE_SELECTORS.forEach((selector) => $(selector).remove());

  const imagesMissingAlt = $('img').toArray().filter((img) => {
    const alt = $(img).attr('alt');
    return alt === undefined || alt.trim() === '';
  }).length;

  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = bodyText === '' ? 0 : bodyText.split(' ').length;

  return {
    httpStatus: response.status,
    responseTimeMs,
    title: $('title').first().text().trim() || null,
    metaDescription: $('meta[name="description"]').attr('content')?.trim() || null,
    h1Count: $('h1').length,
    imagesMissingAlt,
    wordCount,
    contentType,
  };
}

module.exports = { analyzePage, FETCH_TIMEOUT_MS };
