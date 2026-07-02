import { PrismaClient } from '@prisma/client';
import logger from './logger.js';

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' },
  ],
});

prisma.$on('query' as any, (e: any) => {
  logger.debug(`Prisma Query: ${e.query} -- Params: ${e.params}`);
});

prisma.$on('info' as any, (e: any) => {
  logger.info(`Prisma Info: ${e.message}`);
});

prisma.$on('warn' as any, (e: any) => {
  logger.warn(`Prisma Warning: ${e.message}`);
});

prisma.$on('error' as any, (e: any) => {
  logger.error(`Prisma Error: ${e.message}`);
});

export { prisma };
export default prisma;
