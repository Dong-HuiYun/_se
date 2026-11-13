const express = require('express');
const { Pool } = require('pg');
const amqp = require('amqplib');

const QUEUE = 'note.created';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
let channel = null;

// 連接 RabbitMQ，失敗或斷線就每 3 秒重試
async function connectMQ() {
  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL);
    conn.on('error', () => {});
    conn.on('close', () => { channel = null; setTimeout(connectMQ, 3000); });
    const ch = await conn.createChannel();
    await ch.assertQueue(QUEUE, { durable: true });
    channel = ch;
    console.log('connected to RabbitMQ');
  } catch (e) {
    console.log('RabbitMQ not ready, retry in 3s');
    setTimeout(connectMQ, 3000);
  }
}
connectMQ();

const app = express();
app.use(express.json());

app.get('/api/node/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ service: 'node', runtime: process.version, db: 'ok', mq: channel ? 'ok' : 'down' });
  } catch (e) {
    res.status(500).json({ service: 'node', db: 'error', error: e.message });
  }
});

app.get('/api/node/notes', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 1000);
  const { rows } = await pool.query('SELECT id, text, created_at FROM notes ORDER BY id DESC LIMIT $1', [limit]);
  res.json(rows);
});

app.post('/api/node/notes', async (req, res) => {
  const text = String(req.body.text || '').trim().slice(0, 200);
  if (!text) return res.status(400).json({ error: 'text is required' });
  const { rows } = await pool.query('INSERT INTO notes (text) VALUES ($1) RETURNING *', [text]);
  const note = rows[0];
  // 發出事件後立刻回應，不等 Python 處理完成（非同步）
  let queued = false;
  if (channel) {
    channel.sendToQueue(QUEUE, Buffer.from(JSON.stringify(note)), { persistent: true });
    queued = true;
  }
  res.status(201).json({ ...note, queued });
});

app.listen(3000, () => console.log('node-service listening on :3000'));
