import { Redis } from 'ioredis';
import logger from './logger.js';
import { env } from './env.js';

let redis: Redis | null = null;

try {
  redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 3) {
        logger.warn('⚠️ Redis reconnection attempts exceeded. Proceeding without Redis.');
        return null; // stop retrying
      }
      return Math.min(times * 200, 1000);
    },
  });

  redis.on('connect', () => {
    logger.info('🔌 Redis connected successfully');
  });

  redis.on('error', (error: Error) => {
    // Only log connection errors if we're still retrying
    if (redis && redis.status !== 'end') {
      logger.error('❌ Redis connection error: ' + error.message);
    }
  });
} catch (error) {
  logger.error('❌ Failed to initialize Redis: ' + (error as Error).message);
}

export { redis };
export default redis;
