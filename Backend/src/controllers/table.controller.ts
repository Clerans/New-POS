import { Request, Response, NextFunction } from 'express';
import QRCode from 'qrcode';
import { prisma } from '../config/db.js';

export class TableController {
  getTables = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const branchCode = req.query.branchId as string;
      let branchId: string | undefined = undefined;

      if (branchCode && branchCode !== 'all') {
        const branch = await prisma.branch.findUnique({ where: { code: branchCode } });
        if (branch) {
          branchId = branch.id;
        } else {
          const branchById = await prisma.branch.findUnique({ where: { id: branchCode } });
          if (branchById) branchId = branchById.id;
        }
      }

      const tables = await prisma.restaurantTable.findMany({
        where: branchId ? { branchId } : undefined,
        include: {
          position: true,
          qrCode: true,
          sessions: {
            where: { status: 'ACTIVE' },
            include: { customer: true, waiter: true },
          },
          mergeItem: {
            include: {
              merge: {
                include: {
                  items: {
                    include: { table: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { tableNumber: 'asc' },
      });

      res.status(200).json({
        success: true,
        data: tables,
      });
    } catch (error) {
      next(error);
    }
  };

  createTable = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        tableNumber,
        displayName,
        capacity,
        minGuests,
        maxGuests,
        shape,
        width,
        height,
        rotation,
        x,
        y,
        color,
        branchId,
        floorId,
      } = req.body;

      const table = await prisma.restaurantTable.create({
        data: {
          tableNumber,
          displayName: displayName || `Table ${tableNumber}`,
          capacity: Number(capacity || 4),
          minGuests: Number(minGuests || 1),
          maxGuests: Number(maxGuests || 4),
          shape: shape || 'SQUARE',
          width: Number(width || 80),
          height: Number(height || 80),
          rotation: Number(rotation || 0),
          color,
          branchId,
          floorId,
        },
      });

      // Create coordinates position
      await prisma.tablePosition.create({
        data: {
          tableId: table.id,
          x: Number(x || 100),
          y: Number(y || 100),
          rotation: Number(rotation || 0),
        },
      });

      // Generate SVG QR Code payload
      const qrData = `http://localhost:5173/menu?table=${table.tableNumber}`;
      const svgString = await QRCode.toString(qrData, { type: 'svg' });

      await prisma.tableQrCode.create({
        data: {
          tableId: table.id,
          qrData,
          svgString,
        },
      });

      const fullTable = await prisma.restaurantTable.findUnique({
        where: { id: table.id },
        include: { position: true, qrCode: true },
      });

      res.status(201).json({
        success: true,
        data: fullTable,
      });
    } catch (error) {
      next(error);
    }
  };

  updateTable = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const {
        tableNumber,
        displayName,
        capacity,
        minGuests,
        maxGuests,
        shape,
        width,
        height,
        rotation,
        x,
        y,
        color,
        status,
        floorId,
      } = req.body;

      // Update table details
      const table = await prisma.restaurantTable.update({
        where: { id },
        data: {
          tableNumber,
          displayName,
          capacity: capacity !== undefined ? Number(capacity) : undefined,
          minGuests: minGuests !== undefined ? Number(minGuests) : undefined,
          maxGuests: maxGuests !== undefined ? Number(maxGuests) : undefined,
          shape,
          width: width !== undefined ? Number(width) : undefined,
          height: height !== undefined ? Number(height) : undefined,
          rotation: rotation !== undefined ? Number(rotation) : undefined,
          color,
          status,
          floorId,
        },
      });

      // Update designer coordinates if provided
      if (x !== undefined || y !== undefined || rotation !== undefined) {
        await prisma.tablePosition.upsert({
          where: { tableId: id },
          update: {
            x: x !== undefined ? Number(x) : undefined,
            y: y !== undefined ? Number(y) : undefined,
            rotation: rotation !== undefined ? Number(rotation) : undefined,
          },
          create: {
            tableId: id,
            x: Number(x || 100),
            y: Number(y || 100),
            rotation: Number(rotation || 0),
          },
        });
      }

      // If status changed, emit status updates and record history
      if (status) {
        await prisma.tableStatusHistory.create({
          data: {
            tableId: id,
            status,
          },
        });

        const { emitTableStatusChanged } = await import('../socket/index.js');
        emitTableStatusChanged(id, status);
      }

      const fullTable = await prisma.restaurantTable.findUnique({
        where: { id },
        include: {
          position: true,
          qrCode: true,
          sessions: { where: { status: 'ACTIVE' } },
        },
      });

      res.status(200).json({
        success: true,
        data: fullTable,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteTable = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await prisma.restaurantTable.delete({ where: { id } });

      res.status(200).json({
        success: true,
        message: 'Table deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  openSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tableId, guests, customerId, waiterId } = req.body;

      const table = await prisma.restaurantTable.findUnique({ where: { id: tableId } });
      if (!table) {
        res.status(404).json({ success: false, message: 'Table not found' });
        return;
      }

      // Set table state to occupied
      await prisma.restaurantTable.update({
        where: { id: tableId },
        data: { status: 'OCCUPIED' },
      });

      // Create session logs
      const session = await prisma.tableSession.create({
        data: {
          tableId,
          customerId,
          guests: Number(guests || 1),
          waiterId,
          status: 'ACTIVE',
        },
      });

      await prisma.tableSessionLog.create({
        data: {
          sessionId: session.id,
          action: 'OPENED',
          details: `Session opened with ${guests} guests`,
        },
      });

      await prisma.tableStatusHistory.create({
        data: {
          tableId,
          status: 'OCCUPIED',
        },
      });

      const { emitTableStatusChanged } = await import('../socket/index.js');
      emitTableStatusChanged(tableId, 'OCCUPIED');

      res.status(201).json({
        success: true,
        data: session,
      });
    } catch (error) {
      next(error);
    }
  };

  closeSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tableId } = req.body;

      const session = await prisma.tableSession.findFirst({
        where: { tableId, status: 'ACTIVE' },
      });

      if (!session) {
        res.status(404).json({ success: false, message: 'No active session found for this table' });
        return;
      }

      // Check outstanding unpaid orders
      const orders = await prisma.order.findMany({
        where: { tableId, paymentStatus: 'UNPAID', status: { not: 'CANCELLED' } },
      });

      const totalBill = orders.reduce((sum, order) => sum + order.total, 0);

      // Settle active orders
      if (orders.length > 0) {
        await prisma.order.updateMany({
          where: { tableId, paymentStatus: 'UNPAID', status: { not: 'CANCELLED' } },
          data: { paymentStatus: 'PAID', status: 'COMPLETED' },
        });

        for (const order of orders) {
          await prisma.payment.create({
            data: {
              orderId: order.id,
              amount: order.total,
              method: 'CARD',
            },
          });
        }
      }

      // Set table state to cleaning
      await prisma.restaurantTable.update({
        where: { id: tableId },
        data: { status: 'CLEANING' },
      });

      // Complete session
      await prisma.tableSession.update({
        where: { id: session.id },
        data: {
          status: 'COMPLETED',
          endTime: new Date(),
          totalBill: totalBill || 15.50, // default placeholder simulation value
          orderCount: orders.length || 1,
        },
      });

      await prisma.tableSessionLog.create({
        data: {
          sessionId: session.id,
          action: 'CLOSED',
          details: `Session closed. Total bill settled: $${totalBill || 15.50}`,
        },
      });

      await prisma.tableStatusHistory.create({
        data: {
          tableId,
          status: 'CLEANING',
        },
      });

      const { emitTableStatusChanged } = await import('../socket/index.js');
      emitTableStatusChanged(tableId, 'CLEANING');

      res.status(200).json({
        success: true,
        message: 'Table session closed successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  mergeTables = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { parentTableId, childTableIds } = req.body;

      if (!parentTableId || !childTableIds || childTableIds.length === 0) {
        res.status(400).json({ success: false, message: 'Invalid tables provided' });
        return;
      }

      const merge = await prisma.tableMerge.create({
        data: {
          parentTableId,
          status: 'ACTIVE',
        },
      });

      // Create merge items for parent and all child tables
      const tablesToMerge = [parentTableId, ...childTableIds];
      for (const tabId of tablesToMerge) {
        await prisma.tableMergeItem.create({
          data: {
            mergeId: merge.id,
            tableId: tabId,
          },
        });

        // Set table status to MERGED
        await prisma.restaurantTable.update({
          where: { id: tabId },
          data: { status: 'MERGED' },
        });

        const { emitTableStatusChanged } = await import('../socket/index.js');
        emitTableStatusChanged(tabId, 'MERGED');
      }

      res.status(201).json({
        success: true,
        data: merge,
      });
    } catch (error) {
      next(error);
    }
  };

  splitTables = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mergeId } = req.body;

      const merge = await prisma.tableMerge.findUnique({
        where: { id: mergeId },
        include: { items: true },
      });

      if (!merge) {
        res.status(404).json({ success: false, message: 'Table merge group not found' });
        return;
      }

      // Mark merge group as split
      await prisma.tableMerge.update({
        where: { id: mergeId },
        data: { status: 'SPLIT' },
      });

      // Release all tables
      for (const item of merge.items) {
        await prisma.restaurantTable.update({
          where: { id: item.tableId },
          data: { status: 'AVAILABLE' },
        });

        const { emitTableStatusChanged } = await import('../socket/index.js');
        emitTableStatusChanged(item.tableId, 'AVAILABLE');
      }

      // Remove merge items
      await prisma.tableMergeItem.deleteMany({
        where: { mergeId },
      });

      res.status(200).json({
        success: true,
        message: 'Tables split successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  transferTable = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fromTableId, toTableId } = req.body;

      const activeSession = await prisma.tableSession.findFirst({
        where: { tableId: fromTableId, status: 'ACTIVE' },
      });

      if (!activeSession) {
        res.status(400).json({ success: false, message: 'No active dining session on the origin table' });
        return;
      }

      // Update session destination table ID
      await prisma.tableSession.update({
        where: { id: activeSession.id },
        data: { tableId: toTableId },
      });

      // Transfer active orders
      await prisma.order.updateMany({
        where: { tableId: fromTableId, paymentStatus: 'UNPAID' },
        data: { tableId: toTableId },
      });

      // Update original table to available and new table to occupied
      await prisma.restaurantTable.update({
        where: { id: fromTableId },
        data: { status: 'AVAILABLE' },
      });

      await prisma.restaurantTable.update({
        where: { id: toTableId },
        data: { status: 'OCCUPIED' },
      });

      const { emitTableStatusChanged } = await import('../socket/index.js');
      emitTableStatusChanged(fromTableId, 'AVAILABLE');
      emitTableStatusChanged(toTableId, 'OCCUPIED');

      res.status(200).json({
        success: true,
        message: 'Session transferred successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export default TableController;
