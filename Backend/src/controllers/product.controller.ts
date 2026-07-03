import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { emitProductUpdated, emitPriceChanged, emitModifierUpdated } from '../socket/index.js';

export class ProductController {
  // --- Products CRUD ---
  getProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { categoryId, status, productType, search, page = 1, limit = 100 } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const where: any = {
        deletedAt: null,
      };

      if (categoryId) {
        where.categoryId = categoryId as string;
      }
      if (status) {
        where.status = status as string;
      }
      if (productType) {
        where.productType = productType as string;
      }
      if (search) {
        const s = search as string;
        where.OR = [
          { name: { contains: s, mode: 'insensitive' } },
          { sku: { contains: s, mode: 'insensitive' } },
          { barcode: { contains: s, mode: 'insensitive' } },
        ];
      }

      const products = await prisma.product.findMany({
        where,
        skip,
        take,
        include: {
          category: true,
          images: true,
          variants: {
            include: {
              prices: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          modifiers: {
            include: {
              modifierGroup: {
                include: {
                  options: true,
                },
              },
            },
          },
          branchProducts: true,
          pricings: true,
          nutrition: true,
          analytics: true,
        },
        orderBy: { name: 'asc' },
      });

      const total = await prisma.product.count({ where });

      res.status(200).json({
        success: true,
        data: products,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getProductById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const product = await prisma.product.findFirst({
        where: { id, deletedAt: null },
        include: {
          category: true,
          images: true,
          variants: {
            include: {
              prices: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          modifiers: {
            include: {
              modifierGroup: {
                include: {
                  options: true,
                },
              },
            },
            orderBy: {
              displayOrder: 'asc',
            },
          },
          comboProducts: {
            include: {
              items: {
                include: {
                  product: true,
                },
              },
            },
          },
          branchProducts: true,
          availabilities: true,
          pricings: true,
          nutrition: true,
          analytics: true,
          statusHistory: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Product not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };

  createProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        name,
        displayName,
        sku,
        barcode,
        internalCode,
        shortDescription,
        fullDescription,
        price,
        cost,
        stock,
        minStock,
        brand,
        unit,
        preparationTime,
        recipeLink,
        status,
        productType,
        categoryId,
        // Relations arrays
        images, // string[] URLs
        variants, // ProductVariant[]
        tags, // string[] tagIds
        modifiers, // string[] modifierGroupIds
        comboItems, // { productId, quantity, isRequired, displayOrder }[]
        branchProducts, // { branchId, price, stock, status }[]
        availabilities, // { dayOfWeek, startTime, endTime, branchId }[]
        pricings, // { priceType, price, branchId, startDate, endDate }[]
        nutrition, // { calories, protein, fat, carbohydrates, sugar, sodium, caffeine, allergens, servingSize }
      } = req.body;

      // 1. Verify sku uniqueness
      const existingSku = await prisma.product.findUnique({ where: { sku } });
      if (existingSku) {
        res.status(400).json({ success: false, message: 'SKU already exists' });
        return;
      }

      // 2. Perform transactional database create
      const product = await prisma.$transaction(async (tx) => {
        const prod = await tx.product.create({
          data: {
            name,
            displayName,
            sku,
            barcode,
            internalCode,
            shortDescription,
            fullDescription,
            price: Number(price),
            cost: Number(cost || 0),
            stock: Number(stock || 0),
            minStock: Number(minStock || 10),
            brand,
            unit: unit || 'PCS',
            preparationTime: Number(preparationTime || 10),
            recipeLink,
            status: status || 'ACTIVE',
            productType: productType || 'REGULAR',
            categoryId: categoryId || null,
          },
        });

        // Seed gallery images
        if (images && Array.isArray(images)) {
          await tx.productImage.createMany({
            data: images.map((url, i) => ({
              productId: prod.id,
              url,
              thumbnail: i === 0,
              isGallery: true,
              displayOrder: i,
            })),
          });
        } else {
          // default placeholder image
          await tx.productImage.create({
            data: {
              productId: prod.id,
              url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=200',
              thumbnail: true,
            },
          });
        }

        // Tags map
        if (tags && Array.isArray(tags)) {
          await tx.productTagMap.createMany({
            data: tags.map((tagId) => ({
              productId: prod.id,
              tagId,
            })),
          });
        }

        // Modifiers map
        if (modifiers && Array.isArray(modifiers)) {
          await tx.productModifierMap.createMany({
            data: modifiers.map((modifierGroupId, idx) => ({
              productId: prod.id,
              modifierGroupId,
              displayOrder: idx,
            })),
          });
        }

        // Seeding variants
        if (productType === 'VARIANT' && variants && Array.isArray(variants)) {
          for (const vr of variants) {
            const createdVariant = await tx.productVariant.create({
              data: {
                productId: prod.id,
                name: vr.name,
                sku: vr.sku,
                barcode: vr.barcode,
                price: Number(vr.price),
                cost: Number(vr.cost || 0),
                recipeLink: vr.recipeLink,
                stock: Number(vr.stock || 0),
                minStock: Number(vr.minStock || 5),
                preparationTime: Number(vr.preparationTime || 10),
                status: vr.status || 'ACTIVE',
              },
            });

            // If we have variant prices per branch
            if (vr.prices && Array.isArray(vr.prices)) {
              await tx.productVariantPrice.createMany({
                data: vr.prices.map((vp: any) => ({
                  variantId: createdVariant.id,
                  branchId: vp.branchId,
                  price: Number(vp.price),
                  cost: Number(vp.cost || 0),
                  dineInPrice: vp.dineInPrice ? Number(vp.dineInPrice) : null,
                  takeawayPrice: vp.takeawayPrice ? Number(vp.takeawayPrice) : null,
                  deliveryPrice: vp.deliveryPrice ? Number(vp.deliveryPrice) : null,
                })),
              });
            }
          }
        }

        // Seeding combo parent rules
        if (productType === 'COMBO' && comboItems && Array.isArray(comboItems)) {
          const combo = await tx.comboProduct.create({
            data: {
              productId: prod.id,
              discount: 0,
            },
          });

          await tx.comboItem.createMany({
            data: comboItems.map((ci: any) => ({
              comboProductId: combo.id,
              productId: ci.productId,
              quantity: Number(ci.quantity || 1),
              isRequired: ci.isRequired !== false,
              displayOrder: Number(ci.displayOrder || 0),
            })),
          });
        }

        // Branch configurations
        if (branchProducts && Array.isArray(branchProducts)) {
          await tx.branchProduct.createMany({
            data: branchProducts.map((bp: any) => ({
              productId: prod.id,
              branchId: bp.branchId,
              price: bp.price ? Number(bp.price) : null,
              stock: Number(bp.stock || 0),
              status: bp.status || 'ACTIVE',
            })),
          });
        } else {
          // Setup defaults for all branches
          const branches = await tx.branch.findMany();
          await tx.branchProduct.createMany({
            data: branches.map((b) => ({
              productId: prod.id,
              branchId: b.id,
              price: Number(price),
              stock: Number(stock || 0),
              status: 'ACTIVE',
            })),
          });
        }

        // ProductPricing tiers
        if (pricings && Array.isArray(pricings)) {
          await tx.productPricing.createMany({
            data: pricings.map((pr: any) => ({
              productId: prod.id,
              priceType: pr.priceType,
              price: Number(pr.price),
              branchId: pr.branchId || null,
              startDate: pr.startDate ? new Date(pr.startDate) : null,
              endDate: pr.endDate ? new Date(pr.endDate) : null,
            })),
          });
        }

        // ProductAvailability schedules
        if (availabilities && Array.isArray(availabilities)) {
          await tx.productAvailability.createMany({
            data: availabilities.map((av: any) => ({
              productId: prod.id,
              dayOfWeek: Number(av.dayOfWeek),
              startTime: av.startTime || '00:00',
              endTime: av.endTime || '23:59',
              branchId: av.branchId || null,
            })),
          });
        }

        // ProductNutrition
        if (nutrition) {
          await tx.productNutrition.create({
            data: {
              productId: prod.id,
              calories: nutrition.calories ? Number(nutrition.calories) : null,
              protein: nutrition.protein ? Number(nutrition.protein) : null,
              fat: nutrition.fat ? Number(nutrition.fat) : null,
              carbohydrates: nutrition.carbohydrates ? Number(nutrition.carbohydrates) : null,
              sugar: nutrition.sugar ? Number(nutrition.sugar) : null,
              sodium: nutrition.sodium ? Number(nutrition.sodium) : null,
              caffeine: nutrition.caffeine ? Number(nutrition.caffeine) : null,
              allergens: nutrition.allergens,
              servingSize: nutrition.servingSize,
            },
          });
        }

        // Analytics structure placeholder
        await tx.productAnalytics.create({
          data: {
            productId: prod.id,
            totalSales: 0,
            revenue: 0,
            profit: 0,
          },
        });

        // Audit History
        await tx.productStatusHistory.create({
          data: {
            productId: prod.id,
            oldStatus: 'DRAFT',
            newStatus: prod.status,
            reason: 'Product created in inventory manager',
            changedBy: (req as any).user?.displayName || 'Admin',
          },
        });

        return prod;
      });

      emitProductUpdated(product);

      res.status(201).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };

  updateProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const {
        name,
        displayName,
        sku,
        barcode,
        internalCode,
        shortDescription,
        fullDescription,
        price,
        cost,
        stock,
        minStock,
        brand,
        unit,
        preparationTime,
        recipeLink,
        status,
        productType,
        categoryId,
        // Modifiable relations
        images,
        variants,
        tags,
        modifiers,
        comboItems,
        branchProducts,
        availabilities,
        pricings,
        nutrition,
      } = req.body;

      // 1. Confirm product exists
      const existingProduct = await prisma.product.findFirst({ where: { id, deletedAt: null } });
      if (!existingProduct) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
      }

      // 2. Perform transaction update
      const updatedProduct = await prisma.$transaction(async (tx) => {
        const prod = await tx.product.update({
          where: { id },
          data: {
            name,
            displayName,
            sku,
            barcode,
            internalCode,
            shortDescription,
            fullDescription,
            price: price !== undefined ? Number(price) : undefined,
            cost: cost !== undefined ? Number(cost) : undefined,
            stock: stock !== undefined ? Number(stock) : undefined,
            minStock: minStock !== undefined ? Number(minStock) : undefined,
            brand,
            unit,
            preparationTime: preparationTime !== undefined ? Number(preparationTime) : undefined,
            recipeLink,
            status,
            productType,
            categoryId: categoryId === null ? null : categoryId || undefined,
          },
        });

        // Update status history if changed
        if (status && status !== existingProduct.status) {
          await tx.productStatusHistory.create({
            data: {
              productId: id,
              oldStatus: existingProduct.status,
              newStatus: status,
              reason: 'Product updated in catalog dashboard',
              changedBy: (req as any).user?.displayName || 'Admin',
            },
          });
        }

        // Update images if provided
        if (images && Array.isArray(images)) {
          await tx.productImage.deleteMany({ where: { productId: id } });
          await tx.productImage.createMany({
            data: images.map((url, i) => ({
              productId: id,
              url,
              thumbnail: i === 0,
              isGallery: true,
              displayOrder: i,
            })),
          });
        }

        // Update tags
        if (tags && Array.isArray(tags)) {
          await tx.productTagMap.deleteMany({ where: { productId: id } });
          await tx.productTagMap.createMany({
            data: tags.map((tagId) => ({
              productId: id,
              tagId,
            })),
          });
        }

        // Update modifiers
        if (modifiers && Array.isArray(modifiers)) {
          await tx.productModifierMap.deleteMany({ where: { productId: id } });
          await tx.productModifierMap.createMany({
            data: modifiers.map((modifierGroupId, idx) => ({
              productId: id,
              modifierGroupId,
              displayOrder: idx,
            })),
          });
        }

        // Update combo items
        if (productType === 'COMBO' && comboItems && Array.isArray(comboItems)) {
          await tx.comboItem.deleteMany({ where: { comboProduct: { productId: id } } });
          let combo = await tx.comboProduct.findFirst({ where: { productId: id } });
          if (!combo) {
            combo = await tx.comboProduct.create({ data: { productId: id, discount: 0 } });
          }
          await tx.comboItem.createMany({
            data: comboItems.map((ci: any) => ({
              comboProductId: combo!.id,
              productId: ci.productId,
              quantity: Number(ci.quantity || 1),
              isRequired: ci.isRequired !== false,
              displayOrder: Number(ci.displayOrder || 0),
            })),
          });
        }

        // Update variants (Delete and recreate or merge)
        if (productType === 'VARIANT' && variants && Array.isArray(variants)) {
          // Keep SKU tracking safe by removing existing variants and adding current ones
          // Note: In production we could also update existing and delete missing. 
          // Let's implement full variant reconciliation to preserve variant IDs if possible, or simple replace.
          // Replace is safer for development.
          await tx.productVariant.deleteMany({ where: { productId: id } });
          for (const vr of variants) {
            const variant = await tx.productVariant.create({
              data: {
                productId: id,
                name: vr.name,
                sku: vr.sku,
                barcode: vr.barcode,
                price: Number(vr.price),
                cost: Number(vr.cost || 0),
                recipeLink: vr.recipeLink,
                stock: Number(vr.stock || 0),
                minStock: Number(vr.minStock || 5),
                preparationTime: Number(vr.preparationTime || 10),
                status: vr.status || 'ACTIVE',
              },
            });

            if (vr.prices && Array.isArray(vr.prices)) {
              await tx.productVariantPrice.createMany({
                data: vr.prices.map((vp: any) => ({
                  variantId: variant.id,
                  branchId: vp.branchId,
                  price: Number(vp.price),
                  cost: Number(vp.cost || 0),
                  dineInPrice: vp.dineInPrice ? Number(vp.dineInPrice) : null,
                  takeawayPrice: vp.takeawayPrice ? Number(vp.takeawayPrice) : null,
                  deliveryPrice: vp.deliveryPrice ? Number(vp.deliveryPrice) : null,
                })),
              });
            }
          }
        }

        // Update branch configuration
        if (branchProducts && Array.isArray(branchProducts)) {
          await tx.branchProduct.deleteMany({ where: { productId: id } });
          await tx.branchProduct.createMany({
            data: branchProducts.map((bp: any) => ({
              productId: id,
              branchId: bp.branchId,
              price: bp.price ? Number(bp.price) : null,
              stock: Number(bp.stock || 0),
              status: bp.status || 'ACTIVE',
            })),
          });
        }

        // Update pricing rules
        if (pricings && Array.isArray(pricings)) {
          await tx.productPricing.deleteMany({ where: { productId: id } });
          await tx.productPricing.createMany({
            data: pricings.map((pr: any) => ({
              productId: id,
              priceType: pr.priceType,
              price: Number(pr.price),
              branchId: pr.branchId || null,
              startDate: pr.startDate ? new Date(pr.startDate) : null,
              endDate: pr.endDate ? new Date(pr.endDate) : null,
            })),
          });
          emitPriceChanged({ productId: id, pricings });
        }

        // Update schedules
        if (availabilities && Array.isArray(availabilities)) {
          await tx.productAvailability.deleteMany({ where: { productId: id } });
          await tx.productAvailability.createMany({
            data: availabilities.map((av: any) => ({
              productId: id,
              dayOfWeek: Number(av.dayOfWeek),
              startTime: av.startTime || '00:00',
              endTime: av.endTime || '23:59',
              branchId: av.branchId || null,
            })),
          });
        }

        // Update nutrition
        if (nutrition) {
          await tx.productNutrition.upsert({
            where: { productId: id },
            create: {
              productId: id,
              calories: nutrition.calories ? Number(nutrition.calories) : null,
              protein: nutrition.protein ? Number(nutrition.protein) : null,
              fat: nutrition.fat ? Number(nutrition.fat) : null,
              carbohydrates: nutrition.carbohydrates ? Number(nutrition.carbohydrates) : null,
              sugar: nutrition.sugar ? Number(nutrition.sugar) : null,
              sodium: nutrition.sodium ? Number(nutrition.sodium) : null,
              caffeine: nutrition.caffeine ? Number(nutrition.caffeine) : null,
              allergens: nutrition.allergens,
              servingSize: nutrition.servingSize,
            },
            update: {
              calories: nutrition.calories ? Number(nutrition.calories) : null,
              protein: nutrition.protein ? Number(nutrition.protein) : null,
              fat: nutrition.fat ? Number(nutrition.fat) : null,
              carbohydrates: nutrition.carbohydrates ? Number(nutrition.carbohydrates) : null,
              sugar: nutrition.sugar ? Number(nutrition.sugar) : null,
              sodium: nutrition.sodium ? Number(nutrition.sodium) : null,
              caffeine: nutrition.caffeine ? Number(nutrition.caffeine) : null,
              allergens: nutrition.allergens,
              servingSize: nutrition.servingSize,
            },
          });
        }

        return prod;
      });

      emitProductUpdated(updatedProduct);

      res.status(200).json({
        success: true,
        data: updatedProduct,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const existingProduct = await prisma.product.findFirst({ where: { id, deletedAt: null } });
      if (!existingProduct) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
      }

      // Check order history. If orders exist, do soft delete. Else do hard delete.
      const orderCount = await prisma.orderItem.count({ where: { productId: id } });
      if (orderCount > 0) {
        await prisma.product.update({
          where: { id },
          data: {
            status: 'DISCONTINUED',
            deletedAt: new Date(),
          },
        });

        emitProductUpdated({ id, status: 'DELETED' });

        res.status(200).json({
          success: true,
          message: 'Product contains active order records. Set to ARCHIVED/DISCONTINUED status.',
        });
        return;
      }

      await prisma.product.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });

      emitProductUpdated({ id, status: 'DELETED' });

      res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // --- Modifier Groups & Options CRUD ---
  getModifierGroups = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const groups = await prisma.modifierGroup.findMany({
        include: {
          options: true,
        },
        orderBy: { displayOrder: 'asc' },
      });

      res.status(200).json({
        success: true,
        data: groups,
      });
    } catch (error) {
      next(error);
    }
  };

  getModifierGroupById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const group = await prisma.modifierGroup.findUnique({
        where: { id },
        include: {
          options: true,
        },
      });

      if (!group) {
        res.status(404).json({ success: false, message: 'Modifier group not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: group,
      });
    } catch (error) {
      next(error);
    }
  };

  createModifierGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, minSelection, maxSelection, isRequired, isMultiSelect, status, displayOrder, options } = req.body;

      const group = await prisma.modifierGroup.create({
        data: {
          name,
          description,
          minSelection: minSelection !== undefined ? Number(minSelection) : 0,
          maxSelection: maxSelection !== undefined ? Number(maxSelection) : 1,
          isRequired: isRequired === true,
          isMultiSelect: isMultiSelect === true,
          status: status || 'ACTIVE',
          displayOrder: displayOrder !== undefined ? Number(displayOrder) : 0,
          options: options && Array.isArray(options)
            ? {
                create: options.map((opt: any) => ({
                  name: opt.name,
                  price: Number(opt.price || 0),
                  sku: opt.sku,
                  recipeLink: opt.recipeLink,
                  inventoryItemId: opt.inventoryItemId,
                  isAvailable: opt.isAvailable !== false,
                })),
              }
            : undefined,
        },
        include: {
          options: true,
        },
      });

      emitModifierUpdated(group);

      res.status(201).json({
        success: true,
        data: group,
      });
    } catch (error) {
      next(error);
    }
  };

  updateModifierGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name, description, minSelection, maxSelection, isRequired, isMultiSelect, status, displayOrder, options } = req.body;

      // Update options
      if (options && Array.isArray(options)) {
        await prisma.modifierOption.deleteMany({ where: { modifierGroupId: id } });
      }

      const group = await prisma.modifierGroup.update({
        where: { id },
        data: {
          name,
          description,
          minSelection: minSelection !== undefined ? Number(minSelection) : undefined,
          maxSelection: maxSelection !== undefined ? Number(maxSelection) : undefined,
          isRequired,
          isMultiSelect,
          status,
          displayOrder: displayOrder !== undefined ? Number(displayOrder) : undefined,
          options: options && Array.isArray(options)
            ? {
                create: options.map((opt: any) => ({
                  name: opt.name,
                  price: Number(opt.price || 0),
                  sku: opt.sku,
                  recipeLink: opt.recipeLink,
                  inventoryItemId: opt.inventoryItemId,
                  isAvailable: opt.isAvailable !== false,
                })),
              }
            : undefined,
        },
        include: {
          options: true,
        },
      });

      emitModifierUpdated(group);

      res.status(200).json({
        success: true,
        data: group,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteModifierGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const group = await prisma.modifierGroup.delete({
        where: { id },
      });

      emitModifierUpdated({ id, status: 'DELETED' });

      res.status(200).json({
        success: true,
        message: 'Modifier group deleted successfully',
        data: group,
      });
    } catch (error) {
      next(error);
    }
  };

  // --- Tags CRUD ---
  getTags = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tags = await prisma.productTag.findMany({
        orderBy: { name: 'asc' },
      });

      res.status(200).json({
        success: true,
        data: tags,
      });
    } catch (error) {
      next(error);
    }
  };

  createTag = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, color } = req.body;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

      const tag = await prisma.productTag.create({
        data: {
          name,
          slug,
          color,
        },
      });

      res.status(201).json({
        success: true,
        data: tag,
      });
    } catch (error) {
      next(error);
    }
  };

  importProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { products } = req.body;
      if (!products || !Array.isArray(products)) {
        res.status(400).json({ success: false, message: 'Invalid products payload, must be an array' });
        return;
      }

      let successRows = 0;
      let failedRows = 0;
      const errorLogs: { row: number; sku: string; error: string }[] = [];

      for (let idx = 0; idx < products.length; idx++) {
        const item = products[idx];
        const rowNum = idx + 1;
        
        try {
          if (!item.name || !item.sku || item.price === undefined) {
            throw new Error('Missing required fields: name, sku, and price are required');
          }

          // Lookup category by name if categoryName provided, else try categoryId
          let catId: string | null = null;
          if (item.categoryName) {
            const category = await prisma.category.findUnique({
              where: { name: item.categoryName },
            });
            if (category) {
              catId = category.id;
            } else {
              // Create category on the fly if it doesn't exist
              const newCat = await prisma.category.create({
                data: {
                  name: item.categoryName,
                  slug: item.categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
                }
              });
              catId = newCat.id;
            }
          } else if (item.categoryId) {
            catId = item.categoryId;
          }

          const productData = {
            name: item.name,
            displayName: item.displayName || item.name,
            barcode: item.barcode || null,
            internalCode: item.internalCode || null,
            shortDescription: item.shortDescription || null,
            fullDescription: item.fullDescription || null,
            price: Number(item.price),
            cost: Number(item.cost || 0),
            stock: Number(item.stock || 0),
            minStock: Number(item.minStock || 10),
            brand: item.brand || null,
            unit: item.unit || 'PCS',
            preparationTime: Number(item.preparationTime || 10),
            recipeLink: item.recipeLink || null,
            status: item.status || 'ACTIVE',
            productType: item.productType || 'REGULAR',
            categoryId: catId,
          };

          // Upsert product
          await prisma.product.upsert({
            where: { sku: item.sku },
            create: {
              ...productData,
              sku: item.sku,
            },
            update: productData,
          });

          successRows++;
        } catch (err: any) {
          failedRows++;
          errorLogs.push({
            row: rowNum,
            sku: item.sku || 'N/A',
            error: err.message || 'Unknown processing error',
          });
        }
      }

      // Record this upload event in the database import logs
      const logRecord = await prisma.productImportLog.create({
        data: {
          fileName: req.body.fileName || 'bulk_json_upload.json',
          totalRows: products.length,
          successRows,
          failedRows,
          errors: errorLogs.length > 0 ? JSON.stringify(errorLogs) : null,
        }
      });

      res.status(200).json({
        success: true,
        data: {
          importLogId: logRecord.id,
          totalRows: products.length,
          successRows,
          failedRows,
          errors: errorLogs,
        }
      });
    } catch (error) {
      next(error);
    }
  };

  exportProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { format } = req.query;

      const products = await prisma.product.findMany({
        where: { deletedAt: null },
        include: {
          category: true,
          variants: true,
          pricings: true,
        }
      });

      if (format === 'csv') {
        let csv = 'Name,SKU,Barcode,Category,Price,Cost,Stock,MinStock,Unit,Status,Type\n';
        for (const p of products) {
          const row = [
            `"${p.name.replace(/"/g, '""')}"`,
            `"${p.sku.replace(/"/g, '""')}"`,
            `"${(p.barcode || '').replace(/"/g, '""')}"`,
            `"${(p.category?.name || '').replace(/"/g, '""')}"`,
            p.price,
            p.cost,
            p.stock,
            p.minStock,
            `"${p.unit}"`,
            `"${p.status}"`,
            `"${p.productType}"`
          ].join(',');
          csv += row + '\n';
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=products_export.csv');
        res.status(200).send(csv);
        return;
      }

      res.status(200).json({
        success: true,
        data: products,
      });
    } catch (error) {
      next(error);
    }
  };

  getImportLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const logs = await prisma.productImportLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      res.status(200).json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default ProductController;
