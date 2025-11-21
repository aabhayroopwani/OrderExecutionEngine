// src/testRedis.ts
import Redis from 'ioredis';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const redis = new Redis(redisUrl);

  try {
    const pong = await redis.ping();
    console.log('PING ->', pong); // should print PONG

    await redis.set('oe:test:key', 'hello-from-node');
    const v = await redis.get('oe:test:key');
    console.log('GET oe:test:key ->', v);

    // Simple pub/sub test (optional)
    // await redis.publish('oe:test:channel', 'message1');

    await redis.quit();
  } catch (err) {
    console.error('Redis test failed:', err);
    process.exit(1);
  }
}

main();
