import { Queue, Worker, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

const connection = new IORedis({
  host: "127.0.0.1",
  port: 6379,
  maxRetriesPerRequest: null,   // REQUIRED
  enableReadyCheck: false       // REQUIRED
});

async function run() {
  const queueName = "testQueue";

  // Queue
  const queue = new Queue(queueName, {
    connection,
  });

  // Worker
  const worker = new Worker(
    queueName,
    async (job) => {
      console.log("Worker processing job:", job.id, job.data);
      return { status: "done" };
    },
    {
      connection,
    }
  );

  // Events
  const events = new QueueEvents(queueName, { connection });

  events.on("completed", ({ jobId }) => {
    console.log(`Job ${jobId} completed`);
  });

  events.on("failed", ({ jobId, failedReason }) => {
    console.log(`Job ${jobId} failed: ${failedReason}`);
  });

  // Add a test job
  await queue.add("testJob", { msg: "hello from BullMQ" });
}

run();
