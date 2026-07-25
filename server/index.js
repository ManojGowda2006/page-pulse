const path = require('node:path');
const express = require('express');
const auditRouter = require('./routes/audit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/audit', auditRouter);

app.listen(PORT, () => {
  console.log(`Page Pulse listening on port ${PORT}`);
});

module.exports = app;
