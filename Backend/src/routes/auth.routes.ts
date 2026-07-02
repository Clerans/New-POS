import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { registerValidator, loginValidator, refreshValidator } from '../validators/auth.validator.js';
import { validateRequest } from '../middlewares/validator.js';

const router = Router();
const controller = new AuthController();

router.post('/register', registerValidator, validateRequest, controller.register);
router.post('/login', loginValidator, validateRequest, controller.login);
router.post('/refresh', refreshValidator, validateRequest, controller.refresh);

export default router;
