Order Execution Engine — Backend (Market Order + Mock DEX Routing)

This project implements a market-order execution engine with DEX routing, Redis-based queueing, PostgreSQL persistence, and real-time WebSocket status streaming.

Built as the Backend Task 2 submission for Eterna Labs On-Campus Placement.

🚀 Features

Market Order execution

DEX Routing between Raydium & Meteora (mocked)

BullMQ + Redis queue (10 concurrent workers + retry logic)

WebSocket live updates
pending → routing → building → submitted → confirmed

Order history stored in PostgreSQL

Minimal frontend (test.html) to visualize everything

Why Market Order?
Market orders demonstrate routing + live lifecycle most clearly.
Limit/sniper orders can be added by introducing price-trigger logic before job execution.

📁 Project Structure
.
├── docker/
│   └── postgres/init.sql          # Creates orders table
├── src/
│   ├── index.ts                   # API + WebSocket + Worker
│   └── dexRouter.ts               # Mock DEX router
├── test.html                      # Minimal frontend tester
├── package.json
├── tsconfig.json
├── .env                           # Local config
└── docker-compose.yml             # Redis + Postgres

🛠️ Prerequisites

Node.js (LTS)

Docker Desktop

npm

Browser (for test UI)

🏁 Quick Start
1️⃣ Start Redis + Postgres
docker-compose up -d


If you want Postgres to re-run the init script:

docker-compose down -v
docker-compose up -d

2️⃣ Create .env
POSTGRES_URL=postgres://postgres:postgres@localhost:5432/orders
REDIS_URL=redis://localhost:6379
PORT=3000

3️⃣ Install dependencies
npm install

4️⃣ Start backend
npm run dev


Terminal output:

Express server running on port 3000

🧪 Test the System
✔ Option A — Browser (Recommended)

Open test.html → click Create Order → auto-connects WebSocket.

You will see:

connected
pending
routing
building
submitted
confirmed

✔ Option B — PowerShell (best for Windows)
Invoke-WebRequest -Uri "http://localhost:3000/api/orders/execute" -Method Post -ContentType "application/json" -Body '{"inputToken":"ETH","outputToken":"USDC","amount":1}'

✔ Option C — Curl (Linux / Git Bash)
curl -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{"inputToken":"ETH","outputToken":"USDC","amount":1}'

✔ View WebSocket Messages
ws://localhost:3000/api/orders/updates/<orderId>


Using wscat:

wscat -c ws://localhost:3000/api/orders/updates/<orderId>

📊 Check Order History in PostgreSQL

Enter DB:

docker exec -it <postgres_container_name> psql -U postgres -d orders


Show all orders:

SELECT * FROM orders ORDER BY created_at DESC;


Last 10:

SELECT * FROM orders ORDER BY created_at DESC LIMIT 10;

⚙️ How It Works (Summary)
Order Flow

POST /api/orders/execute

Order saved → added to BullMQ queue

Worker fetches Raydium & Meteora quotes

Best DEX selected

Simulated swap execution

WebSocket streams lifecycle

Order saved as confirmed/failed

🔀 DEX Routing (Mock)

Raydium price variance: 2–4%

Meteora price variance: 3–5%

Randomized 2–3 second simulated execution

Returns:

selected DEX

executedPrice

txHash

Router logs appear in backend console:

[Quote] Raydium: ...
[Quote] Meteora: ...
[Routing Decision] Selected: ...

📦 Worker (BullMQ)

Queue name: orderQueue

Concurrency: 10

Retries: 3 attempts

Exponential backoff: 1s

Failed jobs:

Mark order as failed

Emit { error: message } event to WebSocket

🔮 Extendability
Limit Order

Add a price-check before enqueueing:

if (currentPrice < limitPrice) queue.add(...)

Sniper Order

Add token-launch event trigger → then enqueue.

Core engine remains identical.

📹 YouTube Demo

(After upload, put link here)

🧰 Useful Commands
# start backend
npm run dev

# start redis + postgres
docker-compose up -d

# open DB
docker exec -it postgres_container psql -U postgres -d orders

# show tables
\dt

# show orders
SELECT * FROM orders;

✅ Submission Deliverables (included)

API: /api/orders/execute

DEX Router w/ price comparison

WebSocket lifecycle streaming

BullMQ queue + retries + concurrency

Mock execution engine

DB persistence

Frontend visualization (test.html)

README (this file)

Console logs showing routing decisions
