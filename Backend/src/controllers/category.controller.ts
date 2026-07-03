import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { emitCategoryUpdated } from '../socket/index.js';

export class CategoryController {
  getCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tree, status } = req.query;

      const where: any = {};
      if (status) {
        where.status = status as string;
      }

      const allCategories = await prisma.category.findMany({
        where,
        include: {
          translations: true,
          _count: {
            select: { products: true }
          }
        },
        orderBy: { displayOrder: 'asc' },
      });

      if (tree === 'true') {
        const buildTree = (parentId: string | null = null): any[] => {
          return allCategories
            .filter((c) => c.parentCategoryId === parentId)
            .map((c) => ({
              ...c,
              subCategories: buildTree(c.id),
            }));
        };
        const categoryTree = buildTree(null);

        res.status(200).json({
          success: true,
          data: categoryTree,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: allCategories,
      });
    } catch (error) {
      next(error);
    }
  };

  getCategoryById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          parentCategory: true,
          subCategories: true,
          translations: true,
          products: {
            take: 10,
          },
        },
      });

      if (!category) {
        res.status(404).json({
          success: false,
          message: 'Category not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  };

  createCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        name,
        slug,
        description,
        image,
        icon,
        displayOrder,
        color,
        parentCategoryId,
        status,
        translations,
      } = req.body;

      const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

      // Check uniqueness
      const existing = await prisma.category.findUnique({ where: { name } });
      if (existing) {
        res.status(400).json({
          success: false,
          message: 'Category with this name already exists',
        });
        return;
      }

      const category = await prisma.category.create({
        data: {
          name,
          slug: generatedSlug,
          description,
          image,
          icon,
          displayOrder: displayOrder ? Number(displayOrder) : 0,
          color,
          parentCategoryId: parentCategoryId || null,
          status: status || 'ACTIVE',
          translations: translations && Array.isArray(translations)
            ? {
                create: translations.map((t: any) => ({
                  language: t.language,
                  name: t.name,
                  description: t.description,
                })),
              }
            : undefined,
        },
        include: {
          translations: true,
        },
      });

      emitCategoryUpdated(category);

      res.status(201).json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  };

  updateCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const {
        name,
        slug,
        description,
        image,
        icon,
        displayOrder,
        color,
        parentCategoryId,
        status,
        translations,
      } = req.body;

      // Verify category exists
      const existingCat = await prisma.category.findUnique({ where: { id } });
      if (!existingCat) {
        res.status(404).json({
          success: false,
          message: 'Category not found',
        });
        return;
      }

      // If parent is being set to itself or one of its descendants (prevent cycles)
      if (parentCategoryId === id) {
        res.status(400).json({
          success: false,
          message: 'A category cannot be its own parent',
        });
        return;
      }

      const generatedSlug = slug || name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

      // Update Translations
      if (translations && Array.isArray(translations)) {
        await prisma.categoryTranslation.deleteMany({ where: { categoryId: id } });
      }

      const category = await prisma.category.update({
        where: { id },
        data: {
          name,
          slug: generatedSlug,
          description,
          image,
          icon,
          displayOrder: displayOrder !== undefined ? Number(displayOrder) : undefined,
          color,
          parentCategoryId: parentCategoryId || null,
          status,
          translations: translations && Array.isArray(translations)
            ? {
                create: translations.map((t: any) => ({
                  language: t.language,
                  name: t.name,
                  description: t.description,
                })),
              }
            : undefined,
        },
        include: {
          translations: true,
        },
      });

      emitCategoryUpdated(category);

      res.status(200).json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Check dependent items
      const productsCount = await prisma.product.count({ where: { categoryId: id } });
      if (productsCount > 0) {
        res.status(400).json({
          success: false,
          message: `Cannot delete category. It contains ${productsCount} products. Move products first.`,
        });
        return;
      }

      const subCategoriesCount = await prisma.category.count({ where: { parentCategoryId: id } });
      if (subCategoriesCount > 0) {
        res.status(400).json({
          success: false,
          message: `Cannot delete category. It contains ${subCategoriesCount} subcategories. Delete or reassign them first.`,
        });
        return;
      }

      const category = await prisma.category.delete({
        where: { id },
      });

      emitCategoryUpdated({ id, status: 'DELETED' });

      res.status(200).json({
        success: true,
        message: 'Category deleted successfully',
        data: category,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default CategoryController;
