import express from "express";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import { Pool } from "pg";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { DexRouter } from "./dexRouter";
import * as dotenv from "dotenv";
import * as crypto from "crypto";

dotenv.config();

// -----------------------------
// EXPRESS SETUP
// -----------------------------
const app = express();
app.use(cors());
app.use(express.json());

// -----------------------------
// POSTGRES
// -----------------------------
const pool = new Pool({
  connectionString:
    process.env.POSTGRES_URL ||
    "postgres://postgres:postgres@localhost:5432/orders",
});

// -----------------------------
// WEBSOCKET SERVER
// -----------------------------
const wss = new WebSocketServer({ noServer: true });

// Store WebSocket connections by orderId
const wsConnections = new Map<string, WebSocket>();

// -----------------------------
// REDIS + BULLMQ
// -----------------------------
const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const orderQueue = new Queue("orderQueue", { connection: redis });

const dexRouter = new DexRouter();

// -----------------------------
// EXPRESS HTTP ROUTES
// -----------------------------
app.post("/api/orders/execute", async (req, res) => {
  try {
    const { inputToken, outputToken, amount } = req.body;

    const orderId = crypto.randomUUID();

    // Insert pending order
    await pool.query(
      `INSERT INTO orders(id, input_token, output_token, amount, status)
       VALUES($1, $2, $3, $4, $5)`,
      [orderId, inputToken, outputToken, amount, "pending"]
    );

    // Add order to queue
    await orderQueue.add(
      "processOrder",
      { orderId, inputToken, outputToken, amount },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
      }
    );

    res.json({ orderId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// -----------------------------
// HANDLE HTTP → WS UPGRADE
// -----------------------------
const server = app.listen(3000, () => {
  console.log("Express server running on port 3000");
});

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);

  if (!url.pathname.startsWith("/api/orders/updates/")) {
    socket.destroy();
    return;
  }

  const orderId = url.pathname.split("/").pop()!;
  if (!orderId) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wsConnections.set(orderId, ws);

    ws.send(JSON.stringify({ orderId, status: "connected" }));

    ws.on("close", () => {
      wsConnections.delete(orderId);
    });
  });
});

// -----------------------------
// WORKER PROCESSING (BullMQ)
// -----------------------------
new Worker(
  "orderQueue",
  async (job) => {
    const { orderId, inputToken, outputToken, amount } = job.data;
    const ws = wsConnections.get(orderId);

    try {
      if (ws) ws.send(JSON.stringify({ orderId, status: "pending" }));
      if (ws) ws.send(JSON.stringify({ orderId, status: "routing" }));

      const { dex, executedPrice, txHash } =
        await dexRouter.executeBestSwap(inputToken, outputToken, amount);

      if (ws) ws.send(JSON.stringify({ orderId, status: "building" }));
      if (ws) ws.send(JSON.stringify({ orderId, status: "submitted" }));

      await pool.query(
        `UPDATE orders SET status=$1, tx_hash=$2 WHERE id=$3`,
        ["confirmed", txHash, orderId]
      );

      if (ws) {
        ws.send(JSON.stringify({ orderId, status: "confirmed", txHash }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      await pool.query(
        `UPDATE orders SET status='failed' WHERE id=$1`,
        [orderId]
      );

      if (ws) {
        ws.send(
          JSON.stringify({
            orderId,
            status: "failed",
            error: message,
          })
        );
      }

      throw err; // rethrow for BullMQ retry
    } finally {
      if (ws) ws.close();
    }
  },
  { connection: redis, concurrency: 10 }
);
