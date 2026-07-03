import { Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

export class SupplierController {
  getSuppliers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { search, status } = req.query;

      const where: any = {};
      if (search) {
        where.OR = [
          { companyName: { contains: String(search), mode: 'insensitive' } },
          { email: { contains: String(search), mode: 'insensitive' } },
          { contactPerson: { contains: String(search), mode: 'insensitive' } },
        ];
      }
      if (status) where.status = String(status);

      const list = await prisma.supplier.findMany({
        where,
        include: {
          contacts: true,
          _count: {
            select: { purchaseOrders: true },
          },
        },
        orderBy: { companyName: 'asc' },
      });

      res.status(200).json({ success: true, data: list });
    } catch (error) {
      next(error);
    }
  };

  getSupplierById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const supplier = await prisma.supplier.findUnique({
        where: { id },
        include: {
          contacts: true,
          purchaseOrders: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          priceLists: {
            include: { items: { include: { ingredient: true } } },
          },
        },
      });

      if (!supplier) {
        return res.status(404).json({ success: false, message: 'Supplier not found' });
      }

      res.status(200).json({ success: true, data: supplier });
    } catch (error) {
      next(error);
    }
  };

  createSupplier = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { contacts, ...rest } = req.body;

      const supplier = await prisma.supplier.create({
        data: {
          ...rest,
          contacts: contacts
            ? {
                create: contacts.map((c: any) => ({
                  name: c.name,
                  email: c.email || null,
                  phone: c.phone || null,
                  role: c.role || null,
                })),
              }
            : undefined,
        },
        include: { contacts: true },
      });

      res.status(201).json({ success: true, data: supplier });
    } catch (error) {
      next(error);
    }
  };

  updateSupplier = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { contacts, ...rest } = req.body;

      const existing = await prisma.supplier.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Supplier not found' });
      }

      const updated = await prisma.supplier.update({
        where: { id },
        data: rest,
        include: { contacts: true },
      });

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  };

  deleteSupplier = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Safety: block if open POs exist
      const openPOs = await prisma.purchaseOrder.count({
        where: {
          supplierId: id,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      });

      if (openPOs > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete supplier. There are ${openPOs} open purchase orders.`,
        });
      }

      await prisma.supplier.update({
        where: { id },
        data: { deletedAt: new Date(), status: 'INACTIVE' },
      });

      res.status(200).json({ success: true, message: 'Supplier deactivated successfully' });
    } catch (error) {
      next(error);
    }
  };

  getPurchaseOrders = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const branchId = req.user?.branchId || undefined;
      const { status, supplierId } = req.query;

      const where: any = { branchId };
      if (status) where.status = String(status);
      if (supplierId) where.supplierId = String(supplierId);

      const list = await prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: true,
          items: { include: { ingredient: { include: { unit: true } } } },
          goodsReceipts: { select: { id: true, grnNumber: true, createdAt: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({ success: true, data: list });
    } catch (error) {
      next(error);
    }
  };

  createPurchaseOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const branchId = req.user?.branchId || null;
      const { supplierId, expectedDate, deliveryAddress, notes, items } = req.body;

      const poNumber = `PO-${Date.now()}`;

      let subtotal = 0;
      for (const item of items) {
        subtotal += Number(item.quantityOrdered) * Number(item.price);
      }
      const tax = subtotal * 0.08;
      const total = subtotal + tax;

      const po = await prisma.purchaseOrder.create({
        data: {
          poNumber,
          supplierId,
          branchId,
          expectedDate: expectedDate ? new Date(expectedDate) : null,
          deliveryAddress: deliveryAddress || null,
          subtotal,
          tax,
          total,
          notes: notes || null,
          status: 'PENDING',
          createdById: req.user?.id || null,
          items: {
            create: items.map((item: any) => ({
              ingredientId: item.ingredientId,
              quantityOrdered: Number(item.quantityOrdered),
              price: Number(item.price),
            })),
          },
        },
        include: {
          items: { include: { ingredient: true } },
          supplier: true,
        },
      });

      res.status(201).json({ success: true, data: po });
    } catch (error) {
      next(error);
    }
  };

  updatePurchaseOrderStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const updated = await prisma.purchaseOrder.update({
        where: { id },
        data: { status },
      });

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  };

  getGoodsReceipts = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const branchId = req.user?.branchId || undefined;

      const list = await prisma.goodsReceipt.findMany({
        where: { branchId },
        include: {
          supplier: true,
          purchaseOrder: true,
          items: {
            include: {
              ingredient: { include: { unit: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({ success: true, data: list });
    } catch (error) {
      next(error);
    }
  };

  getIngredientUnits = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const units = await prisma.ingredientUnit.findMany({
        orderBy: { name: 'asc' },
      });
      res.status(200).json({ success: true, data: units });
    } catch (error) {
      next(error);
    }
  };

  getIngredientCategories = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const categories = await prisma.ingredientCategory.findMany({
        include: { _count: { select: { ingredients: true } } },
        orderBy: { name: 'asc' },
      });
      res.status(200).json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  };

  getStockMovements = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const branchId = req.user?.branchId || undefined;
      const { ingredientId, type, take } = req.query;

      const where: any = { branchId };
      if (ingredientId) where.ingredientId = String(ingredientId);
      if (type) where.type = String(type);

      const movements = await prisma.stockMovement.findMany({
        where,
        include: {
          ingredient: { include: { unit: true } },
          user: { select: { displayName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: take ? Number(take) : 50,
      });

      res.status(200).json({ success: true, data: movements });
    } catch (error) {
      next(error);
    }
  };

  getInventoryAlerts = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const branchId = req.user?.branchId || undefined;

      const alerts = await prisma.inventoryAlert.findMany({
        where: { branchId, isResolved: false },
        orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
      });

      res.status(200).json({ success: true, data: alerts });
    } catch (error) {
      next(error);
    }
  };

  resolveAlert = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const updated = await prisma.inventoryAlert.update({
        where: { id },
        data: { isResolved: true, resolvedAt: new Date() },
      });

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  };
}
