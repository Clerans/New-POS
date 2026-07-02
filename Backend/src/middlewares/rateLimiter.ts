import rateLimit from 'express-rate-limit';
import { errorResponse } from '../utils/response.js';

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: errorResponse('Too many requests from this IP, please try again after 15 minutes.'),
  statusCode: 429,
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login/auth attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: errorResponse('Too many login attempts from this IP, please try again after 15 minutes.'),
  statusCode: 429,
});

export default apiRateLimiter;
