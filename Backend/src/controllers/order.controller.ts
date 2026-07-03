import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import * as socketEmitter from '../socket/index.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

export class OrderController {
  createOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const {
        orderType,
        customerId,
        tableId,
        items,
        discounts,
        taxRules,
        serviceCharge = 0,
        deliveryCharge = 0,
        tips = 0,
        notes,
      } = req.body;

      // 1. Generate invoice number atomically
      const prefix = `CC-${new Date().getFullYear()}-`;
      const sequence = await prisma.invoiceSequence.upsert({
        where: { prefix },
        update: { nextValue: { increment: 1 } },
        create: { prefix, nextValue: 1001 },
      });
      const orderNumber = `${sequence.prefix}${sequence.nextValue}`;

      // 2. Fetch products to compute price details securely
      const productIds = items.map((i: any) => i.productId);
      const dbProducts = await prisma.product.findMany({
        where: { id: { in: productIds } },
      });

      let subtotal = 0;
      const orderItemsData: any[] = [];

      for (const item of items) {
        const product = dbProducts.find((p) => p.id === item.productId);
        if (!product) {
          return res.status(404).json({ success: false, message: `Product ${item.productId} not found` });
        }

        const price = item.priceOverride !== undefined ? Number(item.priceOverride) : product.price;
        let itemSubtotal = price * item.quantity;
        
        // Add modifier prices
        let modifiersPrice = 0;
        if (item.modifiers && Array.isArray(item.modifiers)) {
          modifiersPrice = item.modifiers.reduce((sum: number, mod: any) => sum + (mod.price || 0), 0);
        }
        itemSubtotal += modifiersPrice * item.quantity;
        subtotal += itemSubtotal;

        orderItemsData.push({
          productId: product.id,
          quantity: item.quantity,
          price,
          notes: item.notes || null,
          modifiers: item.modifiers || [],
        });
      }

      // Calculate discounts
      let totalDiscount = 0;
      if (discounts && Array.isArray(discounts)) {
        for (const disc of discounts) {
          if (disc.type === 'PERCENTAGE') {
            totalDiscount += subtotal * (disc.value / 100);
          } else {
            totalDiscount += disc.value;
          }
        }
      }

      // Calculate taxes
      let totalTax = 0;
      const discountedSubtotal = Math.max(0, subtotal - totalDiscount);
      if (taxRules && Array.isArray(taxRules)) {
        for (const tax of taxRules) {
          if (tax.isInclusive) {
            totalTax += discountedSubtotal - (discountedSubtotal / (1 + tax.rate / 100));
          } else {
            totalTax += discountedSubtotal * (tax.rate / 100);
          }
        }
      }

      const total = discountedSubtotal + totalTax + Number(serviceCharge) + Number(deliveryCharge) + Number(tips);

      // 3. Create database Order transaction
      const order = await prisma.$transaction(async (tx) => {
        // Deduct inventory stock levels
        for (const item of orderItemsData) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }

        const createdOrder = await tx.order.create({
          data: {
            orderNumber,
            orderType: orderType || 'EAT_IN',
            status: 'PENDING',
            paymentStatus: 'UNPAID',
            subtotal,
            discount: totalDiscount,
            tax: totalTax,
            serviceCharge: Number(serviceCharge),
            deliveryCharge: Number(deliveryCharge),
            tips: Number(tips),
            total,
            customerId: customerId || null,
            tableId: tableId || null,
            userId: req.user?.id || null,
            branchId: req.user?.branchId || null,
          },
        });

        // Create order items and modifiers
        for (const item of orderItemsData) {
          const createdItem = await tx.orderItem.create({
            data: {
              orderId: createdOrder.id,
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              notes: item.notes,
            },
          });

          if (item.modifiers.length > 0) {
            await tx.orderItemModifier.createMany({
              data: item.modifiers.map((mod: any) => ({
                orderItemId: createdItem.id,
                name: mod.name,
                price: mod.price || 0,
                groupName: mod.groupName || null,
              })),
            });
          }
        }

        // Create order discounts
        if (discounts && discounts.length > 0) {
          await tx.orderDiscount.createMany({
            data: discounts.map((disc: any) => ({
              orderId: createdOrder.id,
              name: disc.name,
              type: disc.type,
              amount: disc.value,
              appliedValue: disc.type === 'PERCENTAGE' ? subtotal * (disc.value / 100) : disc.value,
            })),
          });
        }

        // Add Notes
        if (notes) {
          await tx.orderNote.create({
            data: {
              orderId: createdOrder.id,
              note: notes,
              type: 'GENERAL',
            },
          });
        }

        // Update table occupancy status if Dine In
        if (tableId && orderType === 'EAT_IN') {
          await tx.restaurantTable.update({
            where: { id: tableId },
            data: { status: 'OCCUPIED' },
          });
          socketEmitter.emitTableStatusChanged(tableId, 'OCCUPIED');
        }

        return createdOrder;
      });

      socketEmitter.emitOrderCreated(order);

      res.status(201).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  getOrders = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const orders = await prisma.order.findMany({
        where: req.user?.branchId ? { branchId: req.user.branchId } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          table: true,
          orderItems: {
            include: {
              product: true,
              modifiers: true,
            },
          },
          payments: true,
        },
      });

      res.status(200).json({
        success: true,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  };

  getOrderById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          customer: true,
          table: true,
          orderItems: {
            include: {
              product: true,
              modifiers: true,
            },
          },
          payments: {
            include: {
              transactions: true,
            },
          },
          discounts: true,
          notes: true,
          refunds: {
            include: {
              items: true,
            },
          },
        },
      });

      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  holdOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { orderType, customerId, tableId, items, notes } = req.body;

      const prefix = `HOLD-${new Date().getTime()}`;
      const heldOrder = await prisma.$transaction(async (tx) => {
        const createdHeld = await tx.heldOrder.create({
          data: {
            orderNumber: prefix,
            orderType: orderType || 'EAT_IN',
            subtotal: items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0),
            total: items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0),
            notes: notes || null,
            tableId: tableId || null,
            customerId: customerId || null,
            userId: req.user?.id || null,
          },
        });

        for (const item of items) {
          await tx.heldOrderItem.create({
            data: {
              heldOrderId: createdHeld.id,
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              notes: item.notes || null,
              modifiers: item.modifiers ? JSON.stringify(item.modifiers) : null,
            },
          });
        }

        return createdHeld;
      });

      res.status(201).json({
        success: true,
        data: heldOrder,
      });
    } catch (error) {
      next(error);
    }
  };

  resumeOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const heldOrder = await prisma.heldOrder.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!heldOrder) {
        return res.status(404).json({ success: false, message: 'Held order not found' });
      }

      // Delete from held table
      await prisma.heldOrder.delete({ where: { id } });

      res.status(200).json({
        success: true,
        data: heldOrder,
      });
    } catch (error) {
      next(error);
    }
  };

  getHeldOrders = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const held = await prisma.heldOrder.findMany({
        where: req.user?.id ? { userId: req.user.id } : undefined,
        include: {
          items: {
            include: {
              product: true,
            },
          },
          customer: true,
          table: true,
        },
      });

      res.status(200).json({
        success: true,
        data: held,
      });
    } catch (error) {
      next(error);
    }
  };

  splitOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId, splitItems } = req.body; // splitItems is Array<{ orderItemId: string, quantity: number }>

      const parentOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { orderItems: true },
      });

      if (!parentOrder) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      // 1. Create a child order for split items
      const prefix = `CC-${new Date().getFullYear()}-`;
      const sequence = await prisma.invoiceSequence.upsert({
        where: { prefix },
        update: { nextValue: { increment: 1 } },
        create: { prefix, nextValue: 1001 },
      });
      const orderNumber = `${sequence.prefix}${sequence.nextValue}-S`;

      const childOrder = await prisma.$transaction(async (tx) => {
        let childSubtotal = 0;

        const createdChild = await tx.order.create({
          data: {
            orderNumber,
            orderType: parentOrder.orderType,
            status: 'PENDING',
            paymentStatus: 'UNPAID',
            subtotal: 0,
            total: 0,
            customerId: parentOrder.customerId,
            tableId: parentOrder.tableId,
            branchId: parentOrder.branchId,
          },
        });

        for (const item of splitItems) {
          const parentItem = parentOrder.orderItems.find((oi) => oi.id === item.orderItemId);
          if (!parentItem) continue;

          // Create child order item
          await tx.orderItem.create({
            data: {
              orderId: createdChild.id,
              productId: parentItem.productId,
              quantity: item.quantity,
              price: parentItem.price,
              notes: parentItem.notes,
            },
          });

          childSubtotal += parentItem.price * item.quantity;

          // Deduct quantity from parent item or delete it
          if (parentItem.quantity <= item.quantity) {
            await tx.orderItem.delete({ where: { id: parentItem.id } });
          } else {
            await tx.orderItem.update({
              where: { id: parentItem.id },
              data: { quantity: parentItem.quantity - item.quantity },
            });
          }
        }

        // Recalculate child total
        const childTax = childSubtotal * 0.08;
        const childTotal = childSubtotal + childTax;

        const finalChild = await tx.order.update({
          where: { id: createdChild.id },
          data: {
            subtotal: childSubtotal,
            tax: childTax,
            total: childTotal,
          },
        });

        // Recalculate parent order totals
        const updatedParentItems = await tx.orderItem.findMany({ where: { orderId } });
        const parentSubtotal = updatedParentItems.reduce((sum, oi) => sum + oi.price * oi.quantity, 0);
        const parentTax = parentSubtotal * 0.08;
        const parentTotal = parentSubtotal + parentTax;

        await tx.order.update({
          where: { id: orderId },
          data: {
            subtotal: parentSubtotal,
            tax: parentTax,
            total: parentTotal,
          },
        });

        return finalChild;
      });

      socketEmitter.emitOrderUpdated(parentOrder);
      socketEmitter.emitOrderCreated(childOrder);

      res.status(200).json({
        success: true,
        data: { parentOrderId: orderId, childOrder },
      });
    } catch (error) {
      next(error);
    }
  };

  mergeOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { parentOrderId, childOrderIds } = req.body;

      const mergedOrder = await prisma.$transaction(async (tx) => {
        const parent = await tx.order.findUnique({
          where: { id: parentOrderId },
          include: { orderItems: true },
        });

        if (!parent) {
          throw new Error('Parent order not found');
        }

        let newSubtotal = parent.subtotal;

        for (const childId of childOrderIds) {
          const child = await tx.order.findUnique({
            where: { id: childId },
            include: { orderItems: true },
          });

          if (!child) continue;

          for (const item of child.orderItems) {
            // Check if product already exists in parent order to aggregate quantity
            const existing = parent.orderItems.find((oi) => oi.productId === item.productId);
            if (existing) {
              await tx.orderItem.update({
                where: { id: existing.id },
                data: { quantity: existing.quantity + item.quantity },
              });
            } else {
              await tx.orderItem.create({
                data: {
                  orderId: parent.id,
                  productId: item.productId,
                  quantity: item.quantity,
                  price: item.price,
                  notes: item.notes,
                },
              });
            }
            newSubtotal += item.price * item.quantity;
          }

          // Delete or Void the child order
          await tx.order.delete({ where: { id: childId } });
        }

        // Recalculate parent total
        const newTax = newSubtotal * 0.08;
        const newTotal = newSubtotal + newTax;

        return await tx.order.update({
          where: { id: parent.id },
          data: {
            subtotal: newSubtotal,
            tax: newTax,
            total: newTotal,
          },
          include: {
            orderItems: true,
          },
        });
      });

      socketEmitter.emitOrderUpdated(mergedOrder);

      res.status(200).json({
        success: true,
        data: mergedOrder,
      });
    } catch (error) {
      next(error);
    }
  };

  payOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId, payments, activeShiftId } = req.body;

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { payments: true },
      });

      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      const totalPaidAlready = order.payments.reduce((sum, p) => sum + p.amount, 0);
      const incomingPaid = payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      const totalPaid = totalPaidAlready + incomingPaid;

      const finalStatus = totalPaid >= order.total ? 'PAID' : 'PARTIALLY_PAID';

      const updatedOrder = await prisma.$transaction(async (tx) => {
        // Record payment items
        for (const p of payments) {
          const createdPayment = await tx.payment.create({
            data: {
              orderId,
              amount: Number(p.amount),
              method: p.method,
            },
          });

          await tx.paymentTransaction.create({
            data: {
              paymentId: createdPayment.id,
              transactionType: 'SALE',
              amount: Number(p.amount),
              status: 'SUCCESS',
            },
          });

          // Log transaction inside Cash Shift if cash payment
          if (p.method === 'CASH' && activeShiftId) {
            await tx.shiftTransaction.create({
              data: {
                shiftId: activeShiftId,
                type: 'SALE',
                amount: Number(p.amount),
                reason: `Payment for order ${order.orderNumber}`,
              },
            });

            // Increment cash shift expected balance
            await tx.cashShift.update({
              where: { id: activeShiftId },
              data: {
                closingBalance: { increment: Number(p.amount) },
              },
            });
          }
        }

        const resOrder = await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: finalStatus,
            status: finalStatus === 'PAID' ? 'COMPLETED' : 'PENDING',
          },
          include: {
            table: true,
            customer: true,
            orderItems: {
              include: {
                product: true,
                modifiers: true,
              },
            },
            payments: true,
          },
        });

        // Set dining table status to CLEANING if fully paid
        if (finalStatus === 'PAID' && order.tableId) {
          await tx.restaurantTable.update({
            where: { id: order.tableId },
            data: { status: 'CLEANING' },
          });
          socketEmitter.emitTableStatusChanged(order.tableId, 'CLEANING');
        }

        // Provision dynamic thermal receipt payload in DB
        const receiptNumber = `REC-${new Date().getTime()}`;
        const contentString = JSON.stringify({
          restaurantName: 'CafeChai POS Enterprise',
          orderNumber: resOrder.orderNumber,
          date: resOrder.createdAt,
          items: resOrder.orderItems.map((oi) => ({
            name: oi.product.name,
            quantity: oi.quantity,
            price: oi.price,
            modifiers: oi.modifiers.map((m) => m.name),
          })),
          subtotal: resOrder.subtotal,
          discount: resOrder.discount,
          tax: resOrder.tax,
          serviceCharge: resOrder.serviceCharge,
          total: resOrder.total,
          paidAmount: totalPaid,
          balance: Math.max(0, totalPaid - resOrder.total),
        });

        await tx.receipt.create({
          data: {
            orderId,
            receiptNumber,
            content: contentString,
          },
        });

        return resOrder;
      });

      socketEmitter.emitOrderPaid(updatedOrder);
      socketEmitter.emitKitchenSent(updatedOrder);

      res.status(200).json({
        success: true,
        data: updatedOrder,
      });
    } catch (error) {
      next(error);
    }
  };

  refundOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { orderId, reason, items } = req.body; // items: Array<{ orderItemId: string, quantity: number }>

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { orderItems: true },
      });

      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      const refundNumber = `REF-${new Date().getTime()}`;
      const refund = await prisma.$transaction(async (tx) => {
        let refundTotal = 0;

        const createdRefund = await tx.refund.create({
          data: {
            orderId,
            refundNumber,
            amount: 0,
            reason,
            userId: req.user?.id || null,
          },
        });

        for (const item of items) {
          const orderItem = order.orderItems.find((oi) => oi.id === item.orderItemId);
          if (!orderItem) continue;

          const refundAmount = orderItem.price * item.quantity;
          refundTotal += refundAmount;

          await tx.refundItem.create({
            data: {
              refundId: createdRefund.id,
              orderItemId: item.orderItemId,
              quantity: item.quantity,
              amount: refundAmount,
            },
          });

          // Restore product inventory stock level
          await tx.product.update({
            where: { id: orderItem.productId },
            data: { stock: { increment: item.quantity } },
          });
        }

        // Update refund total amount
        const finalRefund = await tx.refund.update({
          where: { id: createdRefund.id },
          data: { amount: refundTotal },
        });

        // Update order status to REFUNDED / PARTIALLY_REFUNDED
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'REFUNDED',
            paymentStatus: 'REFUNDED',
          },
        });

        return finalRefund;
      });

      res.status(201).json({
        success: true,
        data: refund,
      });
    } catch (error) {
      next(error);
    }
  };

  duplicateOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const original = await prisma.order.findUnique({
        where: { id },
        include: { orderItems: true },
      });

      if (!original) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      const prefix = `CC-${new Date().getFullYear()}-`;
      const sequence = await prisma.invoiceSequence.upsert({
        where: { prefix },
        update: { nextValue: { increment: 1 } },
        create: { prefix, nextValue: 1001 },
      });
      const orderNumber = `${sequence.prefix}${sequence.nextValue}-D`;

      const duplicated = await prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            orderNumber,
            orderType: original.orderType,
            status: 'PENDING',
            paymentStatus: 'UNPAID',
            subtotal: original.subtotal,
            discount: original.discount,
            tax: original.tax,
            serviceCharge: original.serviceCharge,
            total: original.total,
            customerId: original.customerId,
            tableId: original.tableId,
            branchId: original.branchId,
          },
        });

        for (const item of original.orderItems) {
          await tx.orderItem.create({
            data: {
              orderId: created.id,
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              notes: item.notes,
            },
          });
        }

        return created;
      });

      socketEmitter.emitOrderCreated(duplicated);

      res.status(201).json({
        success: true,
        data: duplicated,
      });
    } catch (error) {
      next(error);
    }
  };

  getOrderHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const orders = await prisma.order.findMany({
        where: req.user?.branchId ? { branchId: req.user.branchId } : undefined,
        include: {
          customer: true,
          table: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default OrderController;
