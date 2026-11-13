CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO notes (text) VALUES
  ('Hello from PostgreSQL'),
  ('Docker makes environments reproducible'),
  ('Each service runs in its own container');
