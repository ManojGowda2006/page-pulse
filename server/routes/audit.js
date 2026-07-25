const express = require('express');
const { analyzePage } = require('../lib/analyze');

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
    // Typed errors with proper status codes land in the next branch;
    // this keeps the happy path shippable without crashing on bad input.
    res.status(500).json({ error: 'Failed to audit the given URL.' });
  }
});

module.exports = router;
