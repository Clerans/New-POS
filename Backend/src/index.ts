import express from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/db.js';
import { redis } from './config/redis.js';
import { initializeSocket } from './socket/index.js';
import routes from './routes/index.js';
import authRoutes from './routes/auth.routes.js';
import { errorHandler } from './middlewares/error.js';
import { apiRateLimiter } from './middlewares/rateLimiter.js';
import { errorResponse } from './utils/response.js';

const app = express();
const server = createServer(app);

// Initialize Socket.io Server
initializeSocket(server);

// Base Middleware Stack
app.use(helmet());
app.use(
  cors({
    origin: [env.CLIENT_URL || 'http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  })
);
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Morgan request logging mapped to Winston stream
const morganFormat = env.NODE_ENV === 'development' ? 'dev' : 'combined';
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  })
);

// Apply Global Rate Limiting on API endpoints
app.use('/api', apiRateLimiter);

// Bind main V1 API entry routes
app.use('/api/v1', routes);

// Bind direct /api/auth routes
app.use('/api/auth', authRoutes);

// Catch all unregistered route calls
app.use((req, res) => {
  res.status(404).json(errorResponse('API route not found'));
});

// Centralized error-handling middleware
app.use(errorHandler);

const PORT = env.PORT || 5000;

const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info('🗄️ PostgreSQL database connected successfully');

    if (redis) {
      await redis.connect().catch((e: any) => {
        logger.error('❌ Redis failed to connect on startup: ' + e.message);
      });
    }

    server.listen(PORT, () => {
      logger.info(`🚀 CafeChai POS Server running on port ${PORT} in [${env.NODE_ENV}] mode`);
    });
  } catch (error) {
    logger.error('❌ Server failed to start: ' + (error as Error).message);
    process.exit(1);
  }
};

startServer();

// Handle graceful shutdowns
const shutdown = async () => {
  logger.info('⚠️ Server shutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    if (redis) {
      await redis.quit();
    }
    logger.info('🛑 Server offline.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
export default server;
