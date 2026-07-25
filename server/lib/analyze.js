const cheerio = require('cheerio');
const {
  InvalidUrlError,
  FetchTimeoutError,
  NonHtmlResponseError,
  UnreachableHostError,
} = require('./errors');

const FETCH_TIMEOUT_MS = 8000;
// Stripped before text extraction so word count reflects content, not boilerplate.
const NOISE_SELECTORS = ['script', 'style', 'noscript', 'nav', 'footer'];

function validateUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new InvalidUrlError(`"${url}" is not a valid URL.`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new InvalidUrlError(`URL must use http or https, got "${parsed.protocol}"`);
  }
  return parsed;
}

async function fetchPage(parsedUrl) {
  try {
    return await fetch(parsedUrl.toString(), {
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'User-Agent': 'PagePulse/1.0 (+https://digitalheroesco.com)' },
    });
  } catch (err) {
    if (err.name === 'TimeoutError') {
      throw new FetchTimeoutError(`Request to ${parsedUrl} timed out after ${FETCH_TIMEOUT_MS}ms.`);
    }
    throw new UnreachableHostError(`Could not reach ${parsedUrl}: ${err.cause?.code || err.message}`);
  }
}

async function analyzePage(url) {
  const parsedUrl = validateUrl(url);

  const start = Date.now();
  const response = await fetchPage(parsedUrl);
  const responseTimeMs = Date.now() - start;

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    throw new NonHtmlResponseError(
      `Expected an HTML page but got content-type "${contentType || 'unknown'}".`
    );
  }

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
