import { Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import * as socketEmitter from '../socket/index.js';

export class InventoryController {
  getDashboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const branchId = req.user?.branchId || undefined;

      // 1. Core aggregates
      const ingredients = await prisma.ingredient.findMany({
        where: { branchId },
      });

      let totalValuation = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;
      let availableCount = 0;

      ingredients.forEach((ing) => {
        totalValuation += ing.currentStock * ing.averageCost;
        if (ing.currentStock <= 0) {
          outOfStockCount++;
        } else if (ing.currentStock <= ing.reorderLevel) {
          lowStockCount++;
        } else {
          availableCount++;
        }
      });

      // 2. Expiry dates checks
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);

      const expiringSoon = await prisma.stockBatch.count({
        where: {
          branchId,
          quantity: { gt: 0 },
          expiryDate: { gte: now, lte: nextWeek },
        },
      });

      const expiredCount = await prisma.stockBatch.count({
        where: {
          branchId,
          quantity: { gt: 0 },
          expiryDate: { lt: now },
        },
      });

      // 3. Today's ledger aggregates
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const todayPurchases = await prisma.goodsReceiptItem.aggregate({
        where: {
          goodsReceipt: {
            branchId,
            createdAt: { gte: startOfToday },
          },
        },
        _sum: {
          price: true,
        },
      });

      const todayWaste = await prisma.wasteItem.aggregate({
        where: {
          wasteRecord: {
            branchId,
            createdAt: { gte: startOfToday },
          },
        },
        _sum: {
          cost: true,
        },
      });

      const todayConsumption = await prisma.stockMovement.aggregate({
        where: {
          branchId,
          type: 'SALE',
          createdAt: { gte: startOfToday },
        },
        _sum: {
          quantity: true,
        },
      });

      // 4. Open POs
      const openPOs = await prisma.purchaseOrder.count({
        where: {
          branchId,
          status: { in: ['PENDING', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED'] },
        },
      });

      res.status(200).json({
        success: true,
        data: {
          totalValuation,
          availableCount,
          lowStockCount,
          outOfStockCount,
          expiringSoon,
          expiredCount,
          todayPurchases: todayPurchases._sum.price || 0,
          todayWaste: todayWaste._sum.cost || 0,
          todayConsumption: Math.abs(todayConsumption._sum.quantity || 0),
          openPOs,
          turnoverRate: 0.12, // mock metric
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getIngredients = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { search, categoryId, status } = req.query;
      const branchId = req.user?.branchId || undefined;

      const where: any = {
        branchId,
      };

      if (search) {
        where.OR = [
          { name: { contains: String(search), mode: 'insensitive' } },
          { sku: { contains: String(search), mode: 'insensitive' } },
          { barcode: { contains: String(search), mode: 'insensitive' } },
        ];
      }

      if (categoryId) {
        where.categoryId = String(categoryId);
      }

      if (status) {
        where.status = String(status);
      }

      const list = await prisma.ingredient.findMany({
        where,
        include: {
          category: true,
          unit: true,
        },
        orderBy: { name: 'asc' },
      });

      res.status(200).json({
        success: true,
        data: list,
      });
    } catch (error) {
      next(error);
    }
  };

  createIngredient = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const branchId = req.user?.branchId || null;
      const data = req.body;

      const created = await prisma.ingredient.create({
        data: {
          ...data,
          branchId,
        },
      });

      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (error) {
      next(error);
    }
  };

  updateIngredient = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data = req.body;

      const oldIng = await prisma.ingredient.findUnique({ where: { id } });
      if (!oldIng) {
        return res.status(404).json({ success: false, message: 'Ingredient not found' });
      }

      // Track price changes in history
      if (data.costPrice !== undefined && data.costPrice !== oldIng.costPrice) {
        await prisma.ingredientPriceHistory.create({
          data: {
            ingredientId: id,
            oldPrice: oldIng.costPrice,
            newPrice: Number(data.costPrice),
            changedBy: req.user?.id,
          },
        });
      }

      const updated = await prisma.ingredient.update({
        where: { id },
        data,
      });

      socketEmitter.emitToAll('ingredient_updated', updated);

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteIngredient = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Business Rule: Prevent deleting ingredients used in active recipes
      const usedInRecipe = await prisma.recipeItem.findFirst({
        where: {
          ingredientId: id,
          recipe: { status: 'ACTIVE' },
        },
      });

      if (usedInRecipe) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete ingredient. It is currently being used in one or more active recipes.',
        });
      }

      await prisma.ingredient.delete({
        where: { id },
      });

      res.status(200).json({
        success: true,
        message: 'Ingredient removed from stock registry',
      });
    } catch (error) {
      next(error);
    }
  };

  createGoodsReceipt = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const branchId = req.user?.branchId || null;
      const { purchaseOrderId, supplierId, receivedDate, notes, items } = req.body;

      const result = await prisma.$transaction(async (tx) => {
        const grnNumber = `GRN-${Date.now()}`;
        const grn = await tx.goodsReceipt.create({
          data: {
            grnNumber,
            purchaseOrderId: purchaseOrderId || null,
            supplierId,
            branchId,
            receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
            receivedById: req.user?.id || null,
            notes,
          },
        });

        for (const item of items) {
          await tx.goodsReceiptItem.create({
            data: {
              goodsReceiptId: grn.id,
              ingredientId: item.ingredientId,
              quantityReceived: Number(item.quantityReceived),
              quantityDamaged: Number(item.quantityDamaged || 0),
              quantityRejected: Number(item.quantityRejected || 0),
              price: Number(item.price),
              batchNumber: item.batchNumber || null,
              lotNumber: item.lotNumber || null,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
              manufactureDate: item.manufactureDate ? new Date(item.manufactureDate) : null,
            },
          });

          // Fetch old stock levels and costs
          const ing = await tx.ingredient.findUnique({
            where: { id: item.ingredientId },
          });

          if (ing) {
            const netQuantity = Number(item.quantityReceived) - Number(item.quantityDamaged || 0) - Number(item.quantityRejected || 0);
            const totalStock = ing.currentStock + netQuantity;

            // Weighted average cost recalculation
            let newAverageCost = ing.averageCost;
            if (totalStock > 0 && netQuantity > 0) {
              newAverageCost = (ing.currentStock * ing.averageCost + netQuantity * Number(item.price)) / totalStock;
            }

            // Update Stock details
            await tx.ingredient.update({
              where: { id: item.ingredientId },
              data: {
                currentStock: totalStock,
                averageCost: newAverageCost,
                costPrice: Number(item.price),
                status: totalStock > ing.reorderLevel ? 'AVAILABLE' : totalStock > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK',
              },
            });

            // Create Stock Batch
            await tx.stockBatch.create({
              data: {
                batchNumber: item.batchNumber || `BAT-${Date.now()}`,
                lotNumber: item.lotNumber || null,
                ingredientId: item.ingredientId,
                branchId,
                expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
                manufactureDate: item.manufactureDate ? new Date(item.manufactureDate) : null,
                quantity: netQuantity,
                initialQuantity: netQuantity,
                unitCost: Number(item.price),
                supplierId,
              },
            });

            // Log movement
            await tx.stockMovement.create({
              data: {
                ingredientId: item.ingredientId,
                branchId,
                type: 'PURCHASE',
                quantity: netQuantity,
                balanceAfter: totalStock,
                referenceId: grn.id,
                reason: `Received shipment PO #${purchaseOrderId || 'Direct'}`,
              },
            });
          }

          // Increment PO received quantity
          if (purchaseOrderId) {
            const poItem = await tx.purchaseOrderItem.findFirst({
              where: { purchaseOrderId, ingredientId: item.ingredientId },
            });
            if (poItem) {
              await tx.purchaseOrderItem.update({
                where: { id: poItem.id },
                data: {
                  quantityReceived: { increment: Number(item.quantityReceived) },
                },
              });
            }
          }
        }

        // Close PO if fully received
        if (purchaseOrderId) {
          const po = await tx.purchaseOrder.findUnique({
            where: { id: purchaseOrderId },
            include: { items: true },
          });

          if (po) {
            const allReceived = po.items.every((it) => it.quantityReceived >= it.quantityOrdered);
            await tx.purchaseOrder.update({
              where: { id: purchaseOrderId },
              data: {
                status: allReceived ? 'COMPLETED' : 'PARTIALLY_RECEIVED',
              },
            });
          }
        }

        return grn;
      });

      socketEmitter.emitToAll('goods_receiving_created', result);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  createStockAdjustment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const branchId = req.user?.branchId || null;
      const { type, notes, items } = req.body;

      const result = await prisma.$transaction(async (tx) => {
        const adjustmentNumber = `ADJ-${Date.now()}`;
        const adj = await tx.stockAdjustment.create({
          data: {
            adjustmentNumber,
            branchId,
            type,
            notes,
            createdById: req.user?.id || null,
            status: 'APPROVED', // auto approved in baseline, manager approvals configurable
          },
        });

        for (const item of items) {
          const ing = await tx.ingredient.findUnique({ where: { id: item.ingredientId } });
          if (!ing) continue;

          const variance = Number(item.physicalQuantity) - ing.currentStock;

          await tx.stockAdjustmentItem.create({
            data: {
              adjustmentId: adj.id,
              ingredientId: item.ingredientId,
              systemQuantity: ing.currentStock,
              physicalQuantity: Number(item.physicalQuantity),
              variance,
              unitCost: ing.averageCost,
              reason: item.reason || null,
            },
          });

          // Adjust ingredient current stock
          await tx.ingredient.update({
            where: { id: item.ingredientId },
            data: {
              currentStock: Number(item.physicalQuantity),
              status: Number(item.physicalQuantity) > ing.reorderLevel ? 'AVAILABLE' : Number(item.physicalQuantity) > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK',
            },
          });

          // Adjust batches accordingly: if deduction, deduct FIFO/FEFO. If addition, create a count batch.
          if (variance < 0) {
            const batches = await tx.stockBatch.findMany({
              where: { ingredientId: item.ingredientId, branchId, quantity: { gt: 0 } },
              orderBy: { receivedDate: 'asc' },
            });
            let toDeduct = Math.abs(variance);
            for (const batch of batches) {
              if (toDeduct <= 0) break;
              const take = Math.min(batch.quantity, toDeduct);
              await tx.stockBatch.update({
                where: { id: batch.id },
                data: { quantity: { decrement: take } },
              });
              toDeduct -= take;
            }
          } else if (variance > 0) {
            await tx.stockBatch.create({
              data: {
                batchNumber: `ADJ-${Date.now()}`,
                ingredientId: item.ingredientId,
                branchId,
                quantity: variance,
                initialQuantity: variance,
                unitCost: ing.averageCost,
              },
            });
          }

          // Stock movement log
          await tx.stockMovement.create({
            data: {
              ingredientId: item.ingredientId,
              branchId,
              type: 'ADJUSTMENT',
              quantity: variance,
              balanceAfter: Number(item.physicalQuantity),
              referenceId: adj.id,
              reason: `Stock adjustment: ${type} - ${item.reason || ''}`,
            },
          });
        }

        return adj;
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  createStockTransfer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const fromBranchId = req.user?.branchId || null;
      const { toBranchId, fromLocationId, toLocationId, notes, items } = req.body;

      const result = await prisma.$transaction(async (tx) => {
        const transferNumber = `TRF-${Date.now()}`;
        const trf = await tx.stockTransfer.create({
          data: {
            transferNumber,
            fromBranchId,
            toBranchId,
            fromLocationId,
            toLocationId,
            notes,
            createdById: req.user?.id || null,
            status: 'COMPLETED', // direct execution in baseline seed
          },
        });

        for (const item of items) {
          const qty = Number(item.quantityRequested);

          await tx.stockTransferItem.create({
            data: {
              transferId: trf.id,
              ingredientId: item.ingredientId,
              quantityRequested: qty,
              quantitySent: qty,
              quantityReceived: qty,
            },
          });

          // Deduct from source branch
          const srcIng = await tx.ingredient.findFirst({
            where: { sku: item.sku, branchId: fromBranchId },
          });

          if (srcIng) {
            const nextStock = srcIng.currentStock - qty;
            await tx.ingredient.update({
              where: { id: srcIng.id },
              data: { currentStock: nextStock },
            });

            await tx.stockMovement.create({
              data: {
                ingredientId: srcIng.id,
                branchId: fromBranchId,
                type: 'TRANSFER',
                quantity: -qty,
                balanceAfter: nextStock,
                referenceId: trf.id,
                reason: `Stock transfer sent to branch ID ${toBranchId}`,
              },
            });
          }

          // Add to destination branch
          const destIng = await tx.ingredient.findFirst({
            where: { sku: item.sku, branchId: toBranchId },
          });

          if (destIng) {
            const nextStock = destIng.currentStock + qty;
            await tx.ingredient.update({
              where: { id: destIng.id },
              data: { currentStock: nextStock },
            });

            await tx.stockMovement.create({
              data: {
                ingredientId: destIng.id,
                branchId: toBranchId,
                type: 'TRANSFER',
                quantity: qty,
                balanceAfter: nextStock,
                referenceId: trf.id,
                reason: `Stock transfer received from branch ID ${fromBranchId}`,
              },
            });
          }
        }

        return trf;
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  createWaste = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const branchId = req.user?.branchId || null;
      const { notes, items } = req.body;

      const result = await prisma.$transaction(async (tx) => {
        const wasteNumber = `WST-${Date.now()}`;
        const record = await tx.wasteRecord.create({
          data: {
            wasteNumber,
            branchId,
            notes,
            createdById: req.user?.id || null,
          },
        });

        for (const item of items) {
          const ing = await tx.ingredient.findUnique({ where: { id: item.ingredientId } });
          if (!ing) continue;

          const totalCost = Number(item.quantity) * ing.averageCost;

          await tx.wasteItem.create({
            data: {
              wasteRecordId: record.id,
              ingredientId: item.ingredientId,
              quantity: Number(item.quantity),
              reason: item.reason, // SPOILAGE, EXPIRED, DROPPED, testing
              cost: totalCost,
            },
          });

          // Decrement aggregate stock
          const nextStock = ing.currentStock - Number(item.quantity);
          await tx.ingredient.update({
            where: { id: item.ingredientId },
            data: {
              currentStock: nextStock,
              status: nextStock > ing.reorderLevel ? 'AVAILABLE' : nextStock > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK',
            },
          });

          // Deduct from FIFO batches
          const batches = await tx.stockBatch.findMany({
            where: { ingredientId: item.ingredientId, branchId, quantity: { gt: 0 } },
            orderBy: { receivedDate: 'asc' },
          });

          let toDeduct = Number(item.quantity);
          for (const batch of batches) {
            if (toDeduct <= 0) break;
            const take = Math.min(batch.quantity, toDeduct);
            await tx.stockBatch.update({
              where: { id: batch.id },
              data: { quantity: { decrement: take } },
            });
            toDeduct -= take;
          }

          // Stock movement
          await tx.stockMovement.create({
            data: {
              ingredientId: item.ingredientId,
              branchId,
              type: 'WASTE',
              quantity: -Number(item.quantity),
              balanceAfter: nextStock,
              referenceId: record.id,
              reason: `Recorded waste: ${item.reason}`,
            },
          });
        }

        return record;
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getReports = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const branchId = req.user?.branchId || undefined;

      const valuationLogs = await prisma.inventoryValuationHistory.findMany({
        where: { branchId },
        orderBy: { valuationDate: 'desc' },
        take: 30,
      });

      const wasteSummary = await prisma.wasteItem.groupBy({
        by: ['reason'],
        where: {
          wasteRecord: { branchId },
        },
        _sum: {
          cost: true,
          quantity: true,
        },
      });

      const movements = await prisma.stockMovement.findMany({
        where: { branchId },
        include: { ingredient: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      res.status(200).json({
        success: true,
        data: {
          valuationLogs,
          wasteSummary,
          movements,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
