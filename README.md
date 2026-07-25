# Page Pulse

Paste a URL, get an instant audit: HTTP status, response time, title, meta
description, H1 count, images missing `alt` text, and an approximate word
count. Built for the Digital Heroes SDE internship task.

## Setup

Requires Node.js 18+ (developed on 22).

```bash
npm install
npm start          # http://localhost:3000
```

For local development with auto-restart on file changes:

```bash
npm run dev
```

Run the test suite:

```bash
npm test
```

No environment variables or database required — the app is stateless.

## API contract

### `POST /api/audit`

**Request body** (`application/json`):

```json
{ "url": "https://example.com" }
```

**Success response** — `200 OK`:

```json
{
  "httpStatus": 200,
  "responseTimeMs": 349,
  "title": "Example Domain",
  "metaDescription": null,
  "h1Count": 1,
  "imagesMissingAlt": 0,
  "wordCount": 17,
  "contentType": "text/html"
}
```

| Field | Type | Notes |
|---|---|---|
| `httpStatus` | number | The status code the target page responded with |
| `responseTimeMs` | number | Time from request start to response headers arriving |
| `title` | string \| null | Trimmed text of the first `<title>`; `null` if absent |
| `metaDescription` | string \| null | `content` of `<meta name="description">`; `null` if absent |
| `h1Count` | number | Count of `<h1>` elements |
| `imagesMissingAlt` | number | `<img>` elements with a missing or whitespace-only `alt` |
| `wordCount` | number | Approximate word count of visible body text (see design decisions) |
| `contentType` | string | The target response's `content-type` header |

**Error responses** — body shape is always `{ "error": "<message>" }`:

| Status | Cause |
|---|---|
| `400` | Request body missing `url`, URL is malformed, or uses a non-http(s) protocol (e.g. `ftp://`) |
| `422` | Target responded, but with a non-HTML `content-type` |
| `502` | DNS failure or connection refused reaching the target |
| `504` | Target didn't respond within the 8s timeout |
| `500` | Anything unexpected (should be rare — logged server-side) |

### `GET /api/health`

Returns `{ "status": "ok" }`. Used for deploy/uptime checks.

## Design decisions

**1. Plain `fetch` + cheerio, not a headless browser.** Page Pulse parses
the raw HTML the server returns — it never executes JavaScript. This keeps
the tool fast, dependency-light, and trivial to deploy on a free tier. The
real cost showed up in manual testing: client-rendered SPAs (tested against
a Vite/React site and youtube.com) return an almost-empty `<body>` in their
initial HTML, so `h1Count` and `wordCount` come back near-zero even though
the page looks fully populated in a browser. That's a genuine, documented
limitation rather than a bug — a more accurate (and heavier) version would
render with Puppeteer/Playwright before parsing.

**2. Typed errors instead of one generic catch-all.** `server/lib/errors.js`
defines an `AuditError` base class with four subclasses
(`InvalidUrlError` 400, `NonHtmlResponseError` 422, `UnreachableHostError`
502, `FetchTimeoutError` 504), each carrying its own HTTP status. The route
handler maps any `AuditError` straight to its status and message, and only
falls back to a generic 500 for truly unexpected failures. This means the
frontend (and anyone testing the API directly) gets a specific, actionable
reason instead of a blanket "something went wrong."

**3. Word count and alt-text detection are heuristics, not perfect
accessibility audits.** Before counting words, `script`/`style`/`noscript`/
`nav`/`footer` elements are stripped so boilerplate and JS code don't
inflate the number — otherwise a page's own `<script>` contents would count
as "words." For `imagesMissingAlt`, an empty `alt=""` (the correct markup
for a deliberately decorative image, per WCAG) is currently counted the
same as a missing `alt` attribute entirely. A stricter version would treat
those differently; flagging it here rather than silently overcounting.

## Pull request history

Built as one reviewed PR per feature rather than a single commit dump. Each
was manually tested before merging — happy path and error cases exercised
via Bruno/curl and a real browser, with a screenshot attached to the PR as
verification.

| # | PR | What it added |
|---|---|---|
| 1 | [Scaffold Express app with static serving and health check](https://github.com/ManojGowda2006/page-pulse/pull/1) | Base Express app, static file serving, `/api/health` |
| 2 | [Add POST /api/audit with fetch + cheerio parsing](https://github.com/ManojGowda2006/page-pulse/pull/2) | Core audit endpoint, happy-path parsing |
| 3 | [Add typed errors for invalid URL, timeout, non-HTML, and unreachable host](https://github.com/ManojGowda2006/page-pulse/pull/3) | Proper error handling with distinct HTTP status codes |
| 4 | [Add frontend UI: form, loading/error states, report rendering](https://github.com/ManojGowda2006/page-pulse/pull/4) | User-facing UI + required footer credit line |
| 5 | [Add tests for analyzePage: happy path + 3 failure cases](https://github.com/ManojGowda2006/page-pulse/pull/5) | Test suite (mocked `fetch`, no network calls) |

## Live build

Deployed at: [https://page-pulse-6f92.onrender.com](https://page-pulse-6f92.onrender.com)

Free-tier note: the instance spins down after ~15 minutes of inactivity, so
the first request after idle can take 30-50s to wake up.

Footer credit line links to [digitalheroesco.com](https://digitalheroesco.com)
per the task's live-build requirement.
