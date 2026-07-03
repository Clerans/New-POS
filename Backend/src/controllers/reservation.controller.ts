import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';

export class ReservationController {
  getReservations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reservations = await prisma.reservation.findMany({
        include: {
          customer: true,
          table: true,
          waiter: true,
        },
        orderBy: { reservationTime: 'asc' },
      });

      res.status(200).json({
        success: true,
        data: reservations,
      });
    } catch (error) {
      next(error);
    }
  };

  createReservation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        customerName,
        customerPhone,
        guests,
        reservationTime,
        specialRequests,
        tableId,
        customerId,
        waiterId,
      } = req.body;

      // 1. Conflict detection (2 hours window)
      if (tableId) {
        const timeVal = new Date(reservationTime).getTime();
        const twoHours = 2 * 60 * 60 * 1000;
        const startWindow = new Date(timeVal - twoHours);
        const endWindow = new Date(timeVal + twoHours);

        const conflict = await prisma.reservation.findFirst({
          where: {
            tableId,
            status: { in: ['BOOKED', 'CONFIRMED', 'ARRIVED', 'SEATED'] },
            reservationTime: {
              gte: startWindow,
              lte: endWindow,
            },
          },
        });

        if (conflict) {
          res.status(400).json({
            success: false,
            message: `Double-booking warning: Table is already reserved by ${conflict.customerName} at ${new Date(conflict.reservationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
          });
          return;
        }
      }

      const reservationNumber = `RES-${Math.floor(10000 + Math.random() * 90000)}`;

      const reservation = await prisma.reservation.create({
        data: {
          reservationNumber,
          customerName,
          customerPhone,
          guests: Number(guests || 1),
          reservationTime: new Date(reservationTime),
          specialRequests,
          status: 'CONFIRMED',
          tableId,
          customerId,
          waiterId,
        },
      });

      await prisma.reservationLog.create({
        data: {
          reservationId: reservation.id,
          status: 'CONFIRMED',
          details: `Reservation created for ${guests} guests`,
        },
      });

      const { emitReservationsUpdated } = await import('../socket/index.js');
      emitReservationsUpdated();

      res.status(201).json({
        success: true,
        data: reservation,
      });
    } catch (error) {
      next(error);
    }
  };

  updateReservation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const {
        customerName,
        customerPhone,
        guests,
        reservationTime,
        specialRequests,
        status,
        tableId,
        customerId,
        waiterId,
        arrivalTime,
      } = req.body;

      // Conflict detection on time/table change
      if (tableId || reservationTime) {
        const currentRes = await prisma.reservation.findUnique({ where: { id } });
        const targetTable = tableId || currentRes?.tableId;
        const targetTime = reservationTime ? new Date(reservationTime) : currentRes?.reservationTime;

        if (targetTable && targetTime) {
          const timeVal = new Date(targetTime).getTime();
          const twoHours = 2 * 60 * 60 * 1000;
          const startWindow = new Date(timeVal - twoHours);
          const endWindow = new Date(timeVal + twoHours);

          const conflict = await prisma.reservation.findFirst({
            where: {
              id: { not: id },
              tableId: targetTable,
              status: { in: ['BOOKED', 'CONFIRMED', 'ARRIVED', 'SEATED'] },
              reservationTime: {
                gte: startWindow,
                lte: endWindow,
              },
            },
          });

          if (conflict) {
            res.status(400).json({
              success: false,
              message: `Double-booking warning: Table is already reserved by ${conflict.customerName} at ${new Date(conflict.reservationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
            });
            return;
          }
        }
      }

      const reservation = await prisma.reservation.update({
        where: { id },
        data: {
          customerName,
          customerPhone,
          guests: guests !== undefined ? Number(guests) : undefined,
          reservationTime: reservationTime ? new Date(reservationTime) : undefined,
          specialRequests,
          status,
          tableId,
          customerId,
          waiterId,
          arrivalTime: arrivalTime ? new Date(arrivalTime) : undefined,
        },
      });

      await prisma.reservationLog.create({
        data: {
          reservationId: id,
          status: status || 'UPDATED',
          details: `Reservation updated. Status set to ${status || 'UPDATED'}`,
        },
      });

      // Seated triggers auto table session open!
      if (status === 'SEATED' && reservation.tableId) {
        // Create active dining table session
        await prisma.tableSession.create({
          data: {
            tableId: reservation.tableId,
            customerId: reservation.customerId,
            guests: reservation.guests,
            waiterId: reservation.waiterId,
            status: 'ACTIVE',
          },
        });

        // Set table occupied
        await prisma.restaurantTable.update({
          where: { id: reservation.tableId },
          data: { status: 'OCCUPIED' },
        });

        const { emitTableStatusChanged } = await import('../socket/index.js');
        emitTableStatusChanged(reservation.tableId, 'OCCUPIED');
      }

      const { emitReservationsUpdated } = await import('../socket/index.js');
      emitReservationsUpdated();

      res.status(200).json({
        success: true,
        data: reservation,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteReservation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await prisma.reservation.delete({ where: { id } });

      const { emitReservationsUpdated } = await import('../socket/index.js');
      emitReservationsUpdated();

      res.status(200).json({
        success: true,
        message: 'Reservation deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getWaitlist = async (req: Request, res: Response, next: NextFunction) => {
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

      const waitlist = await prisma.waitlist.findMany({
        where: {
          branchId: branchId ? branchId : undefined,
          status: 'WAITING',
        },
        orderBy: { queueNumber: 'asc' },
      });

      res.status(200).json({
        success: true,
        data: waitlist,
      });
    } catch (error) {
      next(error);
    }
  };

  createWaitlistEntry = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { customerName, customerPhone, guests, priority, branchId } = req.body;

      const activeQueueCount = await prisma.waitlist.count({
        where: { branchId, status: 'WAITING' },
      });

      const queueNumber = activeQueueCount + 1;
      const estimatedWait = queueNumber * 10; // estimate 10 minutes per party

      const waitlist = await prisma.waitlist.create({
        data: {
          queueNumber,
          customerName,
          customerPhone,
          guests: Number(guests || 1),
          priority: priority || 'NORMAL',
          estimatedWait,
          branchId,
          status: 'WAITING',
        },
      });

      const { emitWaitlistUpdated } = await import('../socket/index.js');
      emitWaitlistUpdated();

      res.status(201).json({
        success: true,
        data: waitlist,
      });
    } catch (error) {
      next(error);
    }
  };

  seatWaitlistEntry = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, tableId } = req.body;

      const entry = await prisma.waitlist.findUnique({ where: { id } });
      if (!entry) {
        res.status(404).json({ success: false, message: 'Waitlist entry not found' });
        return;
      }

      // Update waitlist entry status to SEATED
      await prisma.waitlist.update({
        where: { id },
        data: { status: 'SEATED' },
      });

      // Auto open session on the table
      await prisma.tableSession.create({
        data: {
          tableId,
          guests: entry.guests,
          status: 'ACTIVE',
        },
      });

      // Update table to occupied
      await prisma.restaurantTable.update({
        where: { id: tableId },
        data: { status: 'OCCUPIED' },
      });

      // Re-order queue numbers for remaining entries
      const remaining = await prisma.waitlist.findMany({
        where: { branchId: entry.branchId, status: 'WAITING' },
        orderBy: { queueNumber: 'asc' },
      });

      for (let i = 0; i < remaining.length; i++) {
        await prisma.waitlist.update({
          where: { id: remaining[i].id },
          data: {
            queueNumber: i + 1,
            estimatedWait: (i + 1) * 10,
          },
        });
      }

      const { emitWaitlistUpdated, emitTableStatusChanged } = await import('../socket/index.js');
      emitWaitlistUpdated();
      emitTableStatusChanged(tableId, 'OCCUPIED');

      res.status(200).json({
        success: true,
        message: 'Customer seated successfully from waitlist',
      });
    } catch (error) {
      next(error);
    }
  };
}

export default ReservationController;
