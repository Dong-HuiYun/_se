const express = require('express');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const app = express();
app.use(express.json());

app.get('/api/node/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ service: 'node', runtime: process.version, db: 'ok' });
  } catch (e) {
    res.status(500).json({ service: 'node', db: 'error', error: e.message });
  }
});

app.get('/api/node/notes', async (_req, res) => {
  const { rows } = await pool.query('SELECT id, text, created_at FROM notes ORDER BY id DESC LIMIT 20');
  res.json(rows);
});

app.post('/api/node/notes', async (req, res) => {
  const text = String(req.body.text || '').trim().slice(0, 200);
  if (!text) return res.status(400).json({ error: 'text is required' });
  const { rows } = await pool.query('INSERT INTO notes (text) VALUES ($1) RETURNING *', [text]);
  res.status(201).json(rows[0]);
});

app.listen(3000, () => console.log('node-service listening on :3000'));
