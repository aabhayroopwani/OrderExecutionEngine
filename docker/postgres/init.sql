CREATE DATABASE orders;

\c orders;

CREATE TABLE orders (
  id UUID PRIMARY KEY,
  input_token TEXT,
  output_token TEXT,
  amount NUMERIC,
  status TEXT,
  tx_hash TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
