import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import * as socketEmitter from '../socket/index.js';

export class CashShiftController {
  getDrawers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const branchId = req.user?.branchId;
      const drawers = await prisma.cashDrawer.findMany({
        where: branchId ? { branchId } : undefined,
      });

      res.status(200).json({
        success: true,
        data: drawers,
      });
    } catch (error) {
      next(error);
    }
  };

  getShiftStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const activeShift = await prisma.cashShift.findFirst({
        where: {
          userId,
          status: 'OPEN',
        },
        include: {
          drawer: true,
          transactions: true,
        },
      });

      res.status(200).json({
        success: true,
        data: activeShift || null,
      });
    } catch (error) {
      next(error);
    }
  };

  openShift = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { drawerId, openingBalance } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
      }

      // Check if user already has an active shift
      const existing = await prisma.cashShift.findFirst({
        where: { userId, status: 'OPEN' },
      });

      if (existing) {
        return res.status(400).json({ success: false, message: 'You already have an active open shift' });
      }

      const shift = await prisma.$transaction(async (tx) => {
        const createdShift = await tx.cashShift.create({
          data: {
            drawerId,
            userId,
            openingBalance: Number(openingBalance),
            status: 'OPEN',
          },
          include: {
            drawer: true,
          },
        });

        // Set drawer status to OPEN
        await tx.cashDrawer.update({
          where: { id: drawerId },
          data: {
            status: 'OPEN',
            balance: Number(openingBalance),
          },
        });

        return createdShift;
      });

      socketEmitter.emitShiftOpened(shift);

      res.status(201).json({
        success: true,
        data: shift,
      });
    } catch (error) {
      next(error);
    }
  };

  closeShift = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { shiftId, closingBalance } = req.body;

      const shift = await prisma.cashShift.findUnique({
        where: { id: shiftId },
        include: { transactions: true },
      });

      if (!shift) {
        return res.status(404).json({ success: false, message: 'Cash shift not found' });
      }

      if (shift.status === 'CLOSED') {
        return res.status(400).json({ success: false, message: 'Shift is already closed' });
      }

      // Expected balance = opening balance + (cash sales) + (cash-ins) - (cash-outs)
      const salesSum = shift.transactions
        .filter((t) => t.type === 'SALE')
        .reduce((sum, t) => sum + t.amount, 0);

      const cashInSum = shift.transactions
        .filter((t) => t.type === 'CASH_IN')
        .reduce((sum, t) => sum + t.amount, 0);

      const cashOutSum = shift.transactions
        .filter((t) => t.type === 'CASH_OUT')
        .reduce((sum, t) => sum + t.amount, 0);

      const refundSum = shift.transactions
        .filter((t) => t.type === 'REFUND')
        .reduce((sum, t) => sum + t.amount, 0);

      const expectedBalance = shift.openingBalance + salesSum + cashInSum - cashOutSum - refundSum;
      const variance = Number(closingBalance) - expectedBalance;

      const closedShift = await prisma.$transaction(async (tx) => {
        const updatedShift = await tx.cashShift.update({
          where: { id: shiftId },
          data: {
            endTime: new Date(),
            closingBalance: Number(closingBalance),
            expectedBalance,
            variance,
            status: 'CLOSED',
          },
          include: {
            drawer: true,
          },
        });

        // Set drawer to CLOSED and set closing balance
        await tx.cashDrawer.update({
          where: { id: shift.drawerId },
          data: {
            status: 'CLOSED',
            balance: Number(closingBalance),
          },
        });

        return updatedShift;
      });

      socketEmitter.emitShiftClosed(closedShift);

      res.status(200).json({
        success: true,
        data: closedShift,
      });
    } catch (error) {
      next(error);
    }
  };

  cashIn = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { shiftId, amount, reason } = req.body;

      const transaction = await prisma.$transaction(async (tx) => {
        const createdTrans = await tx.shiftTransaction.create({
          data: {
            shiftId,
            type: 'CASH_IN',
            amount: Number(amount),
            reason,
          },
        });

        // Increment drawer balance
        const shift = await tx.cashShift.findUnique({ where: { id: shiftId } });
        if (shift) {
          await tx.cashDrawer.update({
            where: { id: shift.drawerId },
            data: { balance: { increment: Number(amount) } },
          });
        }

        return createdTrans;
      });

      res.status(201).json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  };

  cashOut = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { shiftId, amount, reason } = req.body;

      const transaction = await prisma.$transaction(async (tx) => {
        const createdTrans = await tx.shiftTransaction.create({
          data: {
            shiftId,
            type: 'CASH_OUT',
            amount: Number(amount),
            reason,
          },
        });

        // Decrement drawer balance
        const shift = await tx.cashShift.findUnique({ where: { id: shiftId } });
        if (shift) {
          await tx.cashDrawer.update({
            where: { id: shift.drawerId },
            data: { balance: { decrement: Number(amount) } },
          });
        }

        return createdTrans;
      });

      res.status(201).json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default CashShiftController;
