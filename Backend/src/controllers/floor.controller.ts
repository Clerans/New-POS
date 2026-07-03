import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';

export class FloorController {
  getFloors = async (req: Request, res: Response, next: NextFunction) => {
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

      const floors = await prisma.floor.findMany({
        where: branchId ? { branchId } : undefined,
        orderBy: { displayOrder: 'asc' },
        include: {
          tables: {
            include: {
              position: true,
              qrCode: true
            }
          }
        }
      });

      res.status(200).json({
        success: true,
        data: floors,
      });
    } catch (error) {
      next(error);
    }
  };

  createFloor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, color, displayOrder, branchId } = req.body;
      const floor = await prisma.floor.create({
        data: {
          name,
          description,
          color,
          displayOrder: displayOrder ? Number(displayOrder) : 0,
          branchId,
        },
      });

      res.status(201).json({
        success: true,
        data: floor,
      });
    } catch (error) {
      next(error);
    }
  };

  updateFloor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name, description, color, displayOrder, status } = req.body;

      const floor = await prisma.floor.update({
        where: { id },
        data: {
          name,
          description,
          color,
          displayOrder: displayOrder !== undefined ? Number(displayOrder) : undefined,
          status,
        },
      });

      res.status(200).json({
        success: true,
        data: floor,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteFloor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await prisma.floor.delete({
        where: { id },
      });

      res.status(200).json({
        success: true,
        message: 'Floor deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export default FloorController;
