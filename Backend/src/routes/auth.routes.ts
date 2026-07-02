import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import {
  registerValidator,
  loginValidator,
  refreshValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
  updateProfileValidator,
} from '../validators/auth.validator.js';
import { validateRequest } from '../middlewares/validator.js';
import { authenticate } from '../middlewares/auth.js';
import { loginRateLimiter } from '../middlewares/rateLimiter.js';

const router = Router();
const controller = new AuthController();

// Guest Routes
router.post('/register', registerValidator, validateRequest, controller.register);
router.post('/login', loginRateLimiter, loginValidator, validateRequest, controller.login);
router.post('/refresh', refreshValidator, validateRequest, controller.refresh);
router.post('/forgot-password', forgotPasswordValidator, validateRequest, controller.forgotPassword);
router.post('/reset-password', resetPasswordValidator, validateRequest, controller.resetPassword);

// Authenticated Routes
router.post('/logout', refreshValidator, validateRequest, controller.logout);
router.post('/change-password', authenticate, changePasswordValidator, validateRequest, controller.changePassword);
router.get('/me', authenticate, controller.me);
router.put('/profile', authenticate, updateProfileValidator, validateRequest, controller.updateProfile);
router.get('/sessions', authenticate, controller.getSessions);
router.get('/activity', authenticate, controller.getActivityLogs);
router.delete('/session/:id', authenticate, controller.revokeSession);
router.delete('/logout-all', authenticate, controller.logoutAll);

export default router;
