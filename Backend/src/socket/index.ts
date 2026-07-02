import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import logger from '../config/logger.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UserPayload } from '../middlewares/auth.js';

let io: Server | null = null;

export const initializeSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket: Socket, next) => {
    const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
    
    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as UserPayload;
      (socket as any).user = decoded;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as UserPayload;
    logger.info(`🔌 Socket client connected: ${socket.id} (User: ${user.email})`);

    socket.join(`user:${user.id}`);
    user.roles.forEach((role) => {
      socket.join(`role:${role}`);
    });

    socket.on('disconnect', () => {
      logger.info(`🔌 Socket client disconnected: ${socket.id}`);
    });
  });

  logger.info('🛰️ Socket.io initialized successfully');
  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }
  return io;
};
