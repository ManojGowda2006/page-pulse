const express = require('express');
const { analyzePage } = require('../lib/analyze');
const { AuditError } = require('../lib/errors');

const router = express.Router();

router.post('/', async (req, res) => {
  const { url } = req.body || {};

  if (!url) {
    return res.status(400).json({ error: 'Request body must include a "url" field.' });
  }

  try {
    const report = await analyzePage(url);
    res.json(report);
  } catch (err) {
    if (err instanceof AuditError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to audit the given URL.' });
  }
});

module.exports = router;
