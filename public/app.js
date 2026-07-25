const form = document.getElementById('audit-form');
const urlInput = document.getElementById('url-input');
const submitBtn = document.getElementById('submit-btn');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const reportEl = document.getElementById('report');

const fields = {
  status: document.getElementById('r-status'),
  time: document.getElementById('r-time'),
  title: document.getElementById('r-title'),
  meta: document.getElementById('r-meta'),
  h1: document.getElementById('r-h1'),
  alt: document.getElementById('r-alt'),
  words: document.getElementById('r-words'),
  contentType: document.getElementById('r-content-type'),
};

function show(el) {
  el.classList.remove('hidden');
}

function hide(el) {
  el.classList.add('hidden');
}

function renderReport(report) {
  fields.status.textContent = report.httpStatus;
  fields.time.textContent = `${report.responseTimeMs} ms`;
  fields.title.textContent = report.title || '(none found)';
  fields.meta.textContent = report.metaDescription || '(none found)';
  fields.h1.textContent = report.h1Count;
  fields.alt.textContent = report.imagesMissingAlt;
  fields.words.textContent = report.wordCount;
  fields.contentType.textContent = report.contentType || '(unknown)';
  show(reportEl);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  hide(errorEl);
  hide(reportEl);
  show(loadingEl);
  submitBtn.disabled = true;

  try {
    const response = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: urlInput.value.trim() }),
    });

    const data = await response.json();

    if (!response.ok) {
      errorEl.textContent = data.error || `Request failed with status ${response.status}.`;
      show(errorEl);
      return;
    }

    renderReport(data);
  } catch (err) {
    errorEl.textContent = 'Could not reach the audit service. Check your connection and try again.';
    show(errorEl);
  } finally {
    hide(loadingEl);
    submitBtn.disabled = false;
  }
});
