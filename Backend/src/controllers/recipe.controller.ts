import { Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

export class RecipeController {
  getRecipes = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const branchId = req.user?.branchId || undefined;

      const list = await prisma.recipe.findMany({
        where: { branchId },
        include: {
          product: {
            include: {
              category: true,
            },
          },
          items: {
            include: {
              ingredient: {
                include: {
                  unit: true,
                },
              },
              unit: true,
            },
          },
          steps: true,
        },
        orderBy: { updatedAt: 'desc' },
      });

      // Calculate real-time recipe food cost margins
      const parsedRecipes = list.map((recipe) => {
        let totalCost = 0;

        recipe.items.forEach((item) => {
          let conversionFactor = 1.0;
          if (item.unitId !== item.ingredient.unitId) {
            if (item.unit && item.unit.conversionFactor) {
              conversionFactor = item.unit.conversionFactor;
            }
          }
          const baseQty = item.quantity * conversionFactor;
          const cost = baseQty * item.ingredient.averageCost;
          totalCost += cost;
        });

        const sellingPrice = recipe.product.price || 0.0;
        const profitMargin = sellingPrice > 0 ? ((sellingPrice - totalCost) / sellingPrice) * 100 : 0;

        return {
          ...recipe,
          computedCost: totalCost,
          sellingPrice,
          margin: Number(profitMargin.toFixed(2)),
        };
      });

      res.status(200).json({
        success: true,
        data: parsedRecipes,
      });
    } catch (error) {
      next(error);
    }
  };

  createRecipe = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const branchId = req.user?.branchId || null;
      const { productId, recipeVersion, yield: recipeYield, preparationTime, instructions, calories, items, steps } = req.body;

      const recipe = await prisma.$transaction(async (tx) => {
        // Calculate standard cost
        let recipeCost = 0;
        const allUnits = await tx.ingredientUnit.findMany();

        for (const item of items) {
          const ing = await tx.ingredient.findUnique({ where: { id: item.ingredientId } });
          if (ing) {
            let conversionFactor = 1.0;
            const matchedUnit = allUnits.find((u) => u.id === item.unitId);
            if (matchedUnit && matchedUnit.conversionFactor) {
              conversionFactor = matchedUnit.conversionFactor;
            }
            recipeCost += item.quantity * conversionFactor * ing.averageCost;
          }
        }

        const created = await tx.recipe.create({
          data: {
            productId,
            recipeVersion: recipeVersion || '1.0',
            yield: Number(recipeYield || 1.0),
            preparationTime: Number(preparationTime || 10),
            instructions,
            calories: calories ? Number(calories) : null,
            cost: recipeCost,
            branchId,
            createdById: req.user?.id || null,
          },
        });

        // Insert recipe ingredients items
        for (const item of items) {
          const ing = await tx.ingredient.findUnique({ where: { id: item.ingredientId } });
          let conversionFactor = 1.0;
          const matchedUnit = allUnits.find((u) => u.id === item.unitId);
          if (matchedUnit && matchedUnit.conversionFactor) {
            conversionFactor = matchedUnit.conversionFactor;
          }
          const itemCostShare = ing ? item.quantity * conversionFactor * ing.averageCost : 0;

          await tx.recipeItem.create({
            data: {
              recipeId: created.id,
              ingredientId: item.ingredientId,
              quantity: Number(item.quantity),
              unitId: item.unitId,
              costShare: itemCostShare,
            },
          });
        }

        // Insert recipe instructions preparation steps
        if (steps && Array.isArray(steps)) {
          await tx.recipeStep.createMany({
            data: steps.map((st: any, index: number) => ({
              recipeId: created.id,
              stepNumber: st.stepNumber || index + 1,
              instruction: st.instruction,
              duration: st.duration ? Number(st.duration) : null,
            })),
          });
        }

        // Keep version data snapshots
        await tx.recipeVersion.create({
          data: {
            recipeId: created.id,
            version: recipeVersion || '1.0',
            recipeData: JSON.stringify({ items, steps, instructions }),
            changeNote: 'Initial recipe creation',
          },
        });

        return created;
      });

      res.status(201).json({
        success: true,
        data: recipe,
      });
    } catch (error) {
      next(error);
    }
  };

  updateRecipe = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { recipeVersion, yield: recipeYield, preparationTime, instructions, calories, items, steps, changeNote } = req.body;

      const oldRecipe = await prisma.recipe.findUnique({ where: { id } });
      if (!oldRecipe) {
        return res.status(404).json({ success: false, message: 'Recipe not found' });
      }

      const result = await prisma.$transaction(async (tx) => {
        let recipeCost = 0;
        const allUnits = await tx.ingredientUnit.findMany();

        if (items) {
          // Re-calculate updated recipe costings
          for (const item of items) {
            const ing = await tx.ingredient.findUnique({ where: { id: item.ingredientId } });
            if (ing) {
              let conversionFactor = 1.0;
              const matchedUnit = allUnits.find((u) => u.id === item.unitId);
              if (matchedUnit && matchedUnit.conversionFactor) {
                conversionFactor = matchedUnit.conversionFactor;
              }
              recipeCost += item.quantity * conversionFactor * ing.averageCost;
            }
          }
        } else {
          recipeCost = oldRecipe.cost;
        }

        // Update core recipe parameters
        const updated = await tx.recipe.update({
          where: { id },
          data: {
            recipeVersion: recipeVersion || oldRecipe.recipeVersion,
            yield: recipeYield !== undefined ? Number(recipeYield) : oldRecipe.yield,
            preparationTime: preparationTime !== undefined ? Number(preparationTime) : oldRecipe.preparationTime,
            instructions: instructions !== undefined ? instructions : oldRecipe.instructions,
            calories: calories !== undefined ? (calories ? Number(calories) : null) : oldRecipe.calories,
            cost: recipeCost,
          },
        });

        if (items) {
          // Drop old items and insert updated items
          await tx.recipeItem.deleteMany({ where: { recipeId: id } });
          for (const item of items) {
            const ing = await tx.ingredient.findUnique({ where: { id: item.ingredientId } });
            let conversionFactor = 1.0;
            const matchedUnit = allUnits.find((u) => u.id === item.unitId);
            if (matchedUnit && matchedUnit.conversionFactor) {
              conversionFactor = matchedUnit.conversionFactor;
            }
            const itemCostShare = ing ? item.quantity * conversionFactor * ing.averageCost : 0;

            await tx.recipeItem.create({
              data: {
                recipeId: id,
                ingredientId: item.ingredientId,
                quantity: Number(item.quantity),
                unitId: item.unitId,
                costShare: itemCostShare,
              },
            });
          }
        }

        if (steps) {
          // Drop old steps and insert updated steps
          await tx.recipeStep.deleteMany({ where: { recipeId: id } });
          await tx.recipeStep.createMany({
            data: steps.map((st: any, index: number) => ({
              recipeId: id,
              stepNumber: st.stepNumber || index + 1,
              instruction: st.instruction,
              duration: st.duration ? Number(st.duration) : null,
            })),
          });
        }

        // Track revisions version log
        await tx.recipeVersion.create({
          data: {
            recipeId: id,
            version: recipeVersion || oldRecipe.recipeVersion,
            recipeData: JSON.stringify({ items, steps, instructions }),
            changeNote: changeNote || 'Recipe modifications',
            changedBy: req.user?.email,
          },
        });

        // Track Cost revision log
        if (Math.abs(recipeCost - oldRecipe.cost) > 0.01) {
          await tx.recipeCostHistory.create({
            data: {
              recipeId: id,
              oldCost: oldRecipe.cost,
              newCost: recipeCost,
              changedBy: req.user?.email,
              reason: changeNote || 'Ingredient items update costing adjustment',
            },
          });
        }

        return updated;
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteRecipe = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      await prisma.recipe.delete({
        where: { id },
      });

      res.status(200).json({
        success: true,
        message: 'Recipe configuration removed successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
