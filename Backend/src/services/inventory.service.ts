import { Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';
import * as socketEmitter from '../socket/index.js';

export class InventoryService {
  /**
   * Consume raw ingredient stock when a POS order is paid.
   * Leverages FIFO/FEFO lot-batch sorting and atomic transactions.
   */
  async consumeRecipeForOrder(orderId: string, tx: Prisma.TransactionClient): Promise<void> {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                recipes: {
                  where: { status: 'ACTIVE' },
                  include: {
                    items: {
                      include: {
                        unit: true,
                      },
                    },
                  },
                },
              },
            },
            modifiers: true,
          },
        },
      },
    });

    if (!order) return;

    // Fetch branch inventory setting to check negative stock authorization
    const settings = await tx.inventorySetting.findUnique({
      where: { branchId: order.branchId || '' },
    });
    const allowNegative = settings?.allowNegativeStock ?? false;

    // Load all units in memory for conversion mappings
    const allUnits = await tx.ingredientUnit.findMany();

    for (const item of order.orderItems) {
      // 1. Process base product recipes
      const activeRecipe = item.product.recipes[0];
      if (activeRecipe) {
        for (const recipeItem of activeRecipe.items) {
          const calculatedQty = recipeItem.quantity * item.quantity;

          // Resolve conversions if unitIds differ
          let conversionFactor = 1.0;
          if (recipeItem.unitId !== recipeItem.ingredientId) {
            const matchedUnit = allUnits.find((u) => u.id === recipeItem.unitId);
            if (matchedUnit && matchedUnit.conversionFactor) {
              conversionFactor = matchedUnit.conversionFactor;
            }
          }
          const requiredBaseQty = calculatedQty * conversionFactor;

          await this.deductStock(
            recipeItem.ingredientId,
            order.branchId,
            requiredBaseQty,
            orderId,
            `Consumption for order ${order.orderNumber} - product: ${item.product.name}`,
            allowNegative,
            tx
          );
        }
      }

      // 2. Process product modifiers (e.g. Extra Milk Choice)
      for (const mod of item.modifiers) {
        // Find modifier option to fetch inventoryItemId
        const option = await tx.modifierOption.findFirst({
          where: {
            name: mod.name,
            modifierGroup: {
              name: mod.groupName || undefined,
            },
          },
        });

        if (option?.inventoryItemId) {
          // Deduct 1 unit default base quantity for modifier options
          await this.deductStock(
            option.inventoryItemId,
            order.branchId,
            1.0 * item.quantity,
            orderId,
            `Consumption for order ${order.orderNumber} - modifier option: ${mod.name}`,
            allowNegative,
            tx
          );
        }
      }
    }
  }

  /**
   * Restore ingredient stock when an order is refunded or voided.
   */
  async restoreRecipeForRefund(
    orderId: string,
    refundedItems: Array<{ productId: string; quantity: number }>,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) return;

    const allUnits = await tx.ingredientUnit.findMany();

    for (const item of refundedItems) {
      const activeRecipe = await tx.recipe.findFirst({
        where: { productId: item.productId, status: 'ACTIVE' },
        include: { items: true },
      });

      if (activeRecipe) {
        for (const recipeItem of activeRecipe.items) {
          const calculatedQty = recipeItem.quantity * item.quantity;
          
          let conversionFactor = 1.0;
          const matchedUnit = allUnits.find((u) => u.id === recipeItem.unitId);
          if (matchedUnit && matchedUnit.conversionFactor) {
            conversionFactor = matchedUnit.conversionFactor;
          }
          const restoredBaseQty = calculatedQty * conversionFactor;

          // Increment base ingredient stock
          const ingredient = await tx.ingredient.findUnique({
            where: { id: recipeItem.ingredientId },
          });

          if (!ingredient) continue;

          const newStock = ingredient.currentStock + restoredBaseQty;
          await tx.ingredient.update({
            where: { id: ingredient.id },
            data: { currentStock: newStock },
          });

          // Add quantity back to the newest active batch or create a return batch
          const activeBatch = await tx.stockBatch.findFirst({
            where: { ingredientId: ingredient.id, branchId: order.branchId },
            orderBy: { receivedDate: 'desc' },
          });

          if (activeBatch) {
            await tx.stockBatch.update({
              where: { id: activeBatch.id },
              data: { quantity: { increment: restoredBaseQty } },
            });
          } else {
            await tx.stockBatch.create({
              data: {
                ingredientId: ingredient.id,
                branchId: order.branchId,
                quantity: restoredBaseQty,
                initialQuantity: restoredBaseQty,
                unitCost: ingredient.costPrice,
                batchNumber: 'REFUND-BATCH',
              },
            });
          }

          // Log movement
          await tx.stockMovement.create({
            data: {
              ingredientId: ingredient.id,
              branchId: order.branchId,
              type: 'RETURN',
              quantity: restoredBaseQty,
              balanceAfter: newStock,
              referenceId: orderId,
              reason: `Returned from refunded/voided order ${order.orderNumber}`,
            },
          });
        }
      }
    }
  }

  /**
   * Internal transactional helper to deduct stock, allocate batches, and generate movements.
   */
  private async deductStock(
    ingredientId: string,
    branchId: string | null,
    requiredQty: number,
    referenceId: string,
    reason: string,
    allowNegative: boolean,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    const ingredient = await tx.ingredient.findUnique({
      where: { id: ingredientId },
      include: { unit: true },
    });

    if (!ingredient) return;

    const currentStock = ingredient.currentStock;
    if (currentStock < requiredQty && !allowNegative) {
      throw new Error(`Insufficient inventory stock for ingredient: ${ingredient.name}`);
    }

    const newStock = currentStock - requiredQty;

    // 1. Update ingredient aggregate stock counts
    await tx.ingredient.update({
      where: { id: ingredientId },
      data: {
        currentStock: newStock,
        status: newStock <= 0 ? 'OUT_OF_STOCK' : newStock <= ingredient.reorderLevel ? 'LOW_STOCK' : 'AVAILABLE',
      },
    });

    // 2. Allocate deduction across batches sequentially using FEFO (expiry first) then FIFO (received date)
    const batches = await tx.stockBatch.findMany({
      where: { ingredientId, branchId, quantity: { gt: 0 } },
      orderBy: [
        { expiryDate: 'asc' },
        { receivedDate: 'asc' },
      ],
    });

    let remainingDeduction = requiredQty;
    for (const batch of batches) {
      if (remainingDeduction <= 0) break;

      const takeAmount = Math.min(batch.quantity, remainingDeduction);
      await tx.stockBatch.update({
        where: { id: batch.id },
        data: { quantity: { decrement: takeAmount } },
      });

      remainingDeduction -= takeAmount;
    }

    // 3. Log stock movement history
    await tx.stockMovement.create({
      data: {
        ingredientId,
        branchId,
        type: 'SALE',
        quantity: -requiredQty,
        balanceAfter: newStock,
        referenceId,
        reason,
      },
    });

    // 4. Low stock triggers
    if (newStock <= ingredient.reorderLevel) {
      // Check if an unresolved alert exists
      const existingAlert = await tx.inventoryAlert.findFirst({
        where: {
          referenceId: ingredientId,
          type: 'LOW_STOCK',
          isResolved: false,
          branchId,
        },
      });

      if (!existingAlert) {
        await tx.inventoryAlert.create({
          data: {
            type: 'LOW_STOCK',
            severity: newStock <= 0 ? 'CRITICAL' : 'WARNING',
            message: `Ingredient '${ingredient.name}' is running low (${newStock.toFixed(2)} remaining).`,
            branchId,
          },
        });
        socketEmitter.emitInventoryAlert({
          type: 'LOW_STOCK',
          message: `Ingredient '${ingredient.name}' is running low.`,
        });
      }
    }
  }
}

export const inventoryService = new InventoryService();
