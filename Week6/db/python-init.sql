CREATE TABLE IF NOT EXISTS processed_notes (
  note_id INT PRIMARY KEY,
  length INT NOT NULL,
  word_count INT NOT NULL,
  source TEXT NOT NULL,              -- 'api'（啟動補齊）或 'event'（RabbitMQ 事件）
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS word_freq (
  word TEXT PRIMARY KEY,
  count INT NOT NULL
);
