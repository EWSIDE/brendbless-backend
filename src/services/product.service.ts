import { prisma } from '../config/database.js';
import { ProductQueryDto, CreateProductDto, UpdateProductDto } from '../types/index.js';
import { NotFoundError } from '../middleware/errorHandler.js';
import slugify from 'slugify';

export class ProductService {
  // Generate slug from name
  private generateSlug(name: string): string {
    return slugify(name, {
      lower: true,
      strict: true,
      trim: true
    });
  }

  // Generate unique slug
  private async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    let baseSlug = this.generateSlug(name);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await prisma.product.findFirst({
        where: {
          slug,
          ...(excludeId ? { id: { not: excludeId } } : {})
        }
      });

      if (!existing) break;
      
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  // Get products with pagination and filters
  async getProducts(query: ProductQueryDto) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    // No isActive filter by default - show all products
    // Use ?isActive=true for public catalog or ?isActive=false for inactive only
    const where: any = {};
    
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    // Category filter
    if (query.category) {
      where.category = {
        slug: query.category
      };
    }

    // Search filter
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { description: { contains: query.search } }
      ];
    }

    // Price range filter
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) {
        where.price.gte = query.minPrice;
      }
      if (query.maxPrice !== undefined) {
        where.price.lte = query.maxPrice;
      }
    }

    // Featured filter
    if (query.featured) {
      where.isFeatured = true;
    }

    // On sale filter (compareAtPrice > price)
    if (query.onSale) {
      where.compareAtPrice = { gt: 0 };
    }

    // Sorting
    const orderBy: any = {};
    const sortBy = query.sortBy || 'sortOrder';
    const sortOrder = query.sortOrder || 'asc';

    if (['price', 'name', 'createdAt', 'sortOrder'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.sortOrder = 'asc';
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      }),
      prisma.product.count({ where })
    ]);

    // Parse images JSON
    const parsedProducts = products.map(p => ({
      ...p,
      images: JSON.parse(p.images || '[]')
    }));

    return {
      products: parsedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  // Get single product by ID or slug
  async getProduct(identifier: string): Promise<any> {
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: identifier },
          { slug: identifier }
        ]
      },
      include: {
        category: {
          include: {
            parent: true,
            children: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        }
      }
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    return {
      ...product,
      images: JSON.parse(product.images || '[]'),
      attributes: JSON.parse((product as any).attributes || '{}')
    };
  }

  // Create product (admin)
  async createProduct(data: CreateProductDto): Promise<any> {
    const slug = data.slug 
      ? this.generateSlug(data.slug)
      : await this.generateUniqueSlug(data.name);

    // Parse images: could be stringified JSON array or actual array
    let imagesData: string[] | string = data.images || [];
    if (typeof data.images === 'string') {
      try {
        imagesData = JSON.parse(data.images);
      } catch {
        imagesData = data.images ? [data.images] : [];
      }
    }
    if (!Array.isArray(imagesData)) {
      imagesData = [];
    }

    // Remove brandId/categoryId if undefined to avoid Prisma type issues
    const createData: any = {
      name: data.name,
      slug,
      description: data.description,
      price: data.price,
      compareAtPrice: data.compareAtPrice ?? null,
      sku: data.sku,
      stockQuantity: data.stockQuantity ?? data.stock ?? 0,
      images: JSON.stringify(imagesData),
      tags: JSON.stringify(data.tags || []),
      isActive: data.isActive ?? true,
      isFeatured: data.isFeatured ?? false,
      isPublished: data.isPublished ?? true
    };

    if (data.categoryId !== undefined) createData.categoryId = data.categoryId;
    if (data.brandId !== undefined) createData.brandId = data.brandId;

    // Ensure updatedAt is set for SQLite
    createData.updatedAt = new Date();

    const product = await prisma.product.create({ data: createData });

    return {
      ...product,
      images: JSON.parse(product.images || '[]'),
      attributes: JSON.parse((product as any).attributes || '{}')
    };
  }

  // Update product (admin)
  async updateProduct(id: string, data: UpdateProductDto): Promise<any> {
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundError('Product');
    }

    const updateData: any = { ...data };

    // Handle slug update
    if (data.name && !data.slug) {
      updateData.slug = await this.generateUniqueSlug(data.name, id);
    } else if (data.slug) {
      updateData.slug = this.generateSlug(data.slug);
    }

    // Handle JSON fields - parse images if they come as a string (already stringified by frontend)
    if (data.images !== undefined) {
      if (typeof data.images === 'string') {
        try {
          JSON.parse(data.images);
          updateData.images = data.images;
        } catch {
          updateData.images = JSON.stringify([data.images]);
        }
      } else if (Array.isArray(data.images)) {
        updateData.images = JSON.stringify(data.images);
      } else {
        updateData.images = '[]';
      }
    }

    // Handle tags - always serialize to JSON string
    if (data.tags !== undefined) {
      if (Array.isArray(data.tags)) {
        updateData.tags = JSON.stringify(data.tags);
      } else if (typeof data.tags === 'string') {
        try {
          JSON.parse(data.tags);
          updateData.tags = data.tags;
        } catch {
          updateData.tags = JSON.stringify([data.tags]);
        }
      }
    }

    // Handle attributes - only if field exists in schema
    if (data.attributes !== undefined) {
      try {
        updateData.attributes = typeof data.attributes === 'string'
          ? data.attributes
          : JSON.stringify(data.attributes);
      } catch {
        delete updateData.attributes;
      }
    } else {
      delete updateData.attributes;
    }

    // Remove undefined fields to avoid Prisma errors
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    const updated = await prisma.product.update({
      where: { id },
      data: updateData
    });

    return {
      ...updated,
      images: JSON.parse(updated.images || '[]'),
      attributes: JSON.parse((updated as any).attributes || '{}')
    };
  }

  // Delete product (admin) - permanently remove from database
  async deleteProduct(id: string): Promise<void> {
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundError('Product');
    }

    // Hard delete - permanently remove from database
    await prisma.product.delete({
      where: { id }
    });
  }

  // Reorder products - batch update sortOrder
  async reorderProducts(items: { id: string; sortOrder: number }[]): Promise<void> {
    await prisma.$transaction(
      items.map(item =>
        prisma.product.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder }
        })
      )
    );
  }

  // Get featured products
  async getFeaturedProducts(limit: number = 10): Promise<any[]> {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        isFeatured: true
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
    });

    return products.map(p => ({
      ...p,
      images: JSON.parse(p.images || '[]'),
      attributes: JSON.parse((p as any).attributes || '{}')
    }));
  }

  // Get products on sale
  async getOnSaleProducts(limit: number = 20): Promise<any[]> {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        compareAtPrice: { gt: 0 }
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
    });

    return products.map(p => ({
      ...p,
      images: JSON.parse(p.images || '[]'),
      attributes: JSON.parse((p as any).attributes || '{}')
    }));
  }

  // Get related products
  async getRelatedProducts(productId: string, limit: number = 4): Promise<any[]> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true }
    });

    if (!product || !product.categoryId) {
      return [];
    }

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        categoryId: product.categoryId,
        id: { not: productId }
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
    });

    return products.map(p => ({
      ...p,
      images: JSON.parse(p.images || '[]'),
      attributes: JSON.parse((p as any).attributes || '{}')
    }));
  }
}

export const productService = new ProductService();
