import { prisma } from '../config/database.js';
import { NotFoundError } from '../middleware/errorHandler.js';

export class CategoryService {
  // Generate slug from name
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // Get all categories
  async getCategories(): Promise<any[]> {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    // Build tree structure
    const categoryMap = new Map();
    const rootCategories: any[] = [];

    categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    categories.forEach(cat => {
      const category = categoryMap.get(cat.id);
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children.push(category);
        }
      } else {
        rootCategories.push(category);
      }
    });

    return rootCategories;
  }

  // Get single category by slug
  async getCategory(slug: string): Promise<any> {
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        },
        products: {
          where: { isActive: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            images: true
          }
        }
      }
    });

    if (!category) {
      throw new NotFoundError('Category');
    }

    return {
      ...category,
      products: category.products.map(p => ({
        ...p,
        images: JSON.parse(p.images || '[]')
      }))
    };
  }

  // Get category by ID
  async getCategoryById(id: string): Promise<any> {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          where: { isActive: true }
        }
      }
    });

    if (!category) {
      throw new NotFoundError('Category');
    }

    return category;
  }

  // Create category (admin)
  async createCategory(data: { name: string; slug?: string; description?: string; parentId?: string; sortOrder?: number }): Promise<any> {
    const slug = data.slug || this.generateSlug(data.name);

    // Check if slug exists
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      throw new Error('Category with this slug already exists');
    }

    // Verify parent exists if provided
    if (data.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
      if (!parent) {
        throw new NotFoundError('Parent category');
      }
    }

    return prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        parentId: data.parentId,
        sortOrder: data.sortOrder || 0
      }
    });
  }

  // Update category (admin)
  async updateCategory(id: string, data: { name?: string; slug?: string; description?: string; parentId?: string; sortOrder?: number; isActive?: boolean }): Promise<any> {
    const category = await prisma.category.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundError('Category');
    }

    const updateData: any = { ...data };

    // Handle slug
    if (data.slug) {
      updateData.slug = data.slug;
    } else if (data.name) {
      updateData.slug = this.generateSlug(data.name);
    }

    // Prevent circular reference
    if (data.parentId === id) {
      throw new Error('Category cannot be its own parent');
    }

    return prisma.category.update({
      where: { id },
      data: updateData
    });
  }

  // Delete category (admin)
  async deleteCategory(id: string): Promise<void> {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        products: true
      }
    });

    if (!category) {
      throw new NotFoundError('Category');
    }

    // Check if has children or products
    if (category.children.length > 0) {
      throw new Error('Cannot delete category with subcategories. Delete subcategories first.');
    }

    if (category.products.length > 0) {
      // Soft delete - just mark as inactive
      await prisma.category.update({
        where: { id },
        data: { isActive: false }
      });
    } else {
      // Hard delete
      await prisma.category.delete({ where: { id } });
    }
  }
}

export const categoryService = new CategoryService();
