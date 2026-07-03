import { Router } from 'express';
import { prisma } from '../config/db.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const customers = await prisma.customer.findMany();
    res.status(200).json({
      success: true,
      data: customers,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, phone, email, isLoyaltyMember } = req.body;
    const customer = await prisma.customer.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
        isLoyaltyMember: isLoyaltyMember || false,
        loyaltyPoints: 0,
      },
    });

    res.status(201).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
