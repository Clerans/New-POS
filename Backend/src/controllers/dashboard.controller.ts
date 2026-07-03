import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service.js';
import { prisma } from '../config/db.js';

const dashboardService = new DashboardService();

export class DashboardController {
  private getBranchIdFromCode = async (code: string | undefined): Promise<string | undefined> => {
    if (!code || code === 'all') return undefined;
    const branch = await prisma.branch.findUnique({ where: { code } });
    return branch ? branch.id : undefined;
  };

  getSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const branchCode = req.query.branchId as string;
      const branchId = await this.getBranchIdFromCode(branchCode);
      const data = await dashboardService.getSummary(branchId);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  getSalesAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const branchCode = req.query.branchId as string;
      const filter = req.query.filter as string;
      const customStart = req.query.customStart as string;
      const customEnd = req.query.customEnd as string;

      const branchId = await this.getBranchIdFromCode(branchCode);
      const data = await dashboardService.getSalesAnalytics(branchId, filter, customStart, customEnd);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  getOrderAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const branchCode = req.query.branchId as string;
      const filter = req.query.filter as string;

      const branchId = await this.getBranchIdFromCode(branchCode);
      const data = await dashboardService.getOrderAnalytics(branchId, filter);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  getCustomerAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const branchCode = req.query.branchId as string;
      const filter = req.query.filter as string;

      const branchId = await this.getBranchIdFromCode(branchCode);
      const data = await dashboardService.getCustomerAnalytics(branchId, filter);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  getProductAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const branchCode = req.query.branchId as string;
      const filter = req.query.filter as string;

      const branchId = await this.getBranchIdFromCode(branchCode);
      const data = await dashboardService.getProductAnalytics(branchId, filter);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  getInventorySummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const branchCode = req.query.branchId as string;
      const branchId = await this.getBranchIdFromCode(branchCode);
      const data = await dashboardService.getInventorySummary(branchId);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  getFinancialSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const branchCode = req.query.branchId as string;
      const branchId = await this.getBranchIdFromCode(branchCode);
      const data = await dashboardService.getFinancialSummary(branchId);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  getReservationSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const branchCode = req.query.branchId as string;
      const branchId = await this.getBranchIdFromCode(branchCode);
      const data = await dashboardService.getReservationSummary(branchId);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  getLiveStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const branchCode = req.query.branchId as string;
      const branchId = await this.getBranchIdFromCode(branchCode);
      const data = await dashboardService.getLiveStatus(branchId);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  getRecentOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const branchCode = req.query.branchId as string;
      const branchId = await this.getBranchIdFromCode(branchCode);
      const data = await dashboardService.getRecentOrders(branchId);
      res.status(200).json({
        success: true,
        data: {
          orders: data,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await dashboardService.getNotifications();
      res.status(200).json({
        success: true,
        data: {
          notifications: data,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  createMockOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { branchId: branchCode } = req.body;
      const user = (req as any).user;

      const branchId = await this.getBranchIdFromCode(branchCode);

      const products = await prisma.product.findMany({ take: 3 });
      if (products.length === 0) {
        throw new Error('No products available to create an order');
      }

      const product = products[Math.floor(Math.random() * products.length)];
      const orderNum = `CC-MOCK-${Math.floor(1000 + Math.random() * 9000)}`;

      const subtotal = product.price;
      const tax = subtotal * 0.08;
      const total = subtotal + tax;

      const order = await prisma.order.create({
        data: {
          orderNumber: orderNum,
          orderType: 'EAT_IN',
          status: 'PREPARING',
          paymentStatus: 'PAID',
          paymentMethod: 'CARD',
          subtotal,
          tax,
          total,
          userId: user?.id,
          branchId: branchId || null,
          orderItems: {
            create: {
              productId: product.id,
              quantity: 1,
              price: product.price,
            },
          },
          payments: {
            create: {
              amount: total,
              method: 'CARD',
            },
          },
        },
        include: {
          orderItems: {
            include: { product: true }
          },
          customer: true,
          table: true
        }
      });

      await prisma.product.update({
        where: { id: product.id },
        data: { stock: { decrement: 1 } },
      });

      const { emitOrderCreated } = await import('../socket/index.js');
      emitOrderCreated(order);

      res.status(201).json({
        success: true,
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  };

  restockProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const product = await prisma.product.findUnique({ where: { id } });
      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
      }

      const updatedProduct = await prisma.product.update({
        where: { id },
        data: { stock: product.minStock + 50 },
        include: { category: true }
      });

      const { emitInventoryAlert } = await import('../socket/index.js');
      emitInventoryAlert(updatedProduct);

      res.status(200).json({
        success: true,
        data: { product: updatedProduct },
      });
    } catch (error) {
      next(error);
    }
  };
}

export default DashboardController;
