// Disposable parser fixture: no application bootstrap, database or external service.
const express = require('express');
const app = express();
app.use(express.json({ limit: '2mb' }));
app.get('/health', (_req, res) => res.json({ ok: true }));
app.post('/parse', (req, res) => res.json(req.body));
app.use((error, _req, res, _next) => res.status(error.status || 500).end());
const server = app.listen(0, '127.0.0.1', () => process.send({ port: server.address().port }));
process.once('disconnect', () => server.close());
