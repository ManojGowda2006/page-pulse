const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzePage } = require('../server/lib/analyze');
const {
  InvalidUrlError,
  NonHtmlResponseError,
  UnreachableHostError,
} = require('../server/lib/errors');

const SAMPLE_HTML = `<html>
<head>
<title> My Test Page </title>
<meta name="description" content=" A test page for Page Pulse. ">
</head>
<body>
<h1>Welcome</h1>
<img src="a.png" alt="A description">
<img src="b.png">
<img src="c.png" alt="   ">
<p>Some visible words here for counting purposes.</p>
<script>var x = 1; ignore this entirely;</script>
</body>
</html>`;

function mockResponse({ status = 200, contentType = 'text/html', body = '' }) {
  return {
    status,
    headers: { get: (name) => (name.toLowerCase() === 'content-type' ? contentType : null) },
    text: async () => body,
  };
}

async function withMockedFetch(impl, run) {
  const original = global.fetch;
  global.fetch = impl;
  try {
    await run();
  } finally {
    global.fetch = original;
  }
}

test('analyzePage: happy path parses every field correctly', async () => {
  await withMockedFetch(
    async () => mockResponse({ status: 200, contentType: 'text/html', body: SAMPLE_HTML }),
    async () => {
      const report = await analyzePage('https://example.com');

      assert.equal(report.httpStatus, 200);
      assert.equal(typeof report.responseTimeMs, 'number');
      assert.equal(report.title, 'My Test Page');
      assert.equal(report.metaDescription, 'A test page for Page Pulse.');
      assert.equal(report.h1Count, 1);
      // b.png has no alt attribute, c.png has an alt of only whitespace -> both count.
      assert.equal(report.imagesMissingAlt, 2);
      assert.equal(report.wordCount, 8);
      assert.equal(report.contentType, 'text/html');
    }
  );
});

test('analyzePage: rejects a malformed URL before ever calling fetch', async () => {
  let fetchWasCalled = false;
  await withMockedFetch(
    async () => {
      fetchWasCalled = true;
      return mockResponse({});
    },
    async () => {
      await assert.rejects(() => analyzePage('not-a-real-url'), InvalidUrlError);
    }
  );
  assert.equal(fetchWasCalled, false, 'fetch should never be called for an invalid URL');
});

test('analyzePage: rejects a non-HTML response instead of parsing it as a page', async () => {
  await withMockedFetch(
    async () =>
      mockResponse({ status: 200, contentType: 'application/json', body: '{"ok":true}' }),
    async () => {
      await assert.rejects(() => analyzePage('https://api.example.com/data'), NonHtmlResponseError);
    }
  );
});

test('analyzePage: wraps a DNS/connection failure as UnreachableHostError', async () => {
  await withMockedFetch(
    async () => {
      const err = new TypeError('fetch failed');
      err.cause = { code: 'ENOTFOUND' };
      throw err;
    },
    async () => {
      await assert.rejects(
        () => analyzePage('https://this-domain-does-not-exist-abc123.invalid'),
        UnreachableHostError
      );
    }
  );
});
