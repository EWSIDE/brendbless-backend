import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CartService {
  async getCart(userId: string) {
    const items = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true, name: true, slug: true, price: true,
            compareAtPrice: true, stockQuantity: true, images: true,
            trackInventory: true, isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const validItems = items.filter((i) => i.product && i.product.isActive);

    const subtotal = validItems.reduce((sum, item) => {
      return sum + item.product.price * item.quantity;
    }, 0);

    return { items: validItems, subtotal };
  }

  async addToCart(userId: string, productId: string, quantity = 1) {
    const product = await prisma.product.findUnique({
      where: { id: productId, isActive: true, isPublished: true },
    });
    if (!product) throw new Error('Product not found');
    if (product.trackInventory && product.stockQuantity < quantity) {
      throw new Error('Not enough stock available');
    }

    const existing = await prisma.cartItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) {
      const newQty = existing.quantity + quantity;
      if (product.trackInventory && product.stockQuantity < newQty) {
        throw new Error('Not enough stock available');
      }
      return prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty },
        include: { product: { select: { id: true, name: true, slug: true, price: true, images: true, stockQuantity: true, trackInventory: true } } },
      });
    }

    return prisma.cartItem.create({
      data: { userId, productId, quantity },
      include: { product: { select: { id: true, name: true, slug: true, price: true, images: true, stockQuantity: true, trackInventory: true } } },
    });
  }

  async updateCartItem(userId: string, productId: string, quantity: number) {
    if (quantity <= 0) {
      return this.removeFromCart(userId, productId);
    }

    const item = await prisma.cartItem.findUnique({
      where: { userId_productId: { userId, productId } },
      include: { product: true },
    });
    if (!item) throw new Error('Cart item not found');

    if (item.product.trackInventory && item.product.stockQuantity < quantity) {
      throw new Error('Not enough stock available');
    }

    return prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity },
      include: { product: { select: { id: true, name: true, slug: true, price: true, images: true, stockQuantity: true, trackInventory: true } } },
    });
  }

  async removeFromCart(userId: string, productId: string) {
    await prisma.cartItem.deleteMany({
      where: { userId, productId },
    });
    return { success: true };
  }

  async clearCart(userId: string) {
    await prisma.cartItem.deleteMany({ where: { userId } });
    return { success: true };
  }

  async getCartCount(userId: string) {
    const count = await prisma.cartItem.aggregate({
      where: { userId },
      _sum: { quantity: true },
    });
    return count._sum.quantity || 0;
  }

  async validateCart(userId: string) {
    const items = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true, name: true, price: true, stockQuantity: true,
            trackInventory: true, isActive: true, isPublished: true,
          },
        },
      },
    });

    const issues: { productId: string; issue: string }[] = [];
    for (const item of items) {
      if (!item.product || !item.product.isActive || !item.product.isPublished) {
        issues.push({ productId: item.productId, issue: 'Product is no longer available' });
      } else if (item.product.trackInventory && item.product.stockQuantity < item.quantity) {
        issues.push({ productId: item.productId, issue: `Only ${item.product.stockQuantity} units available` });
      }
    }

    return { valid: issues.length === 0, issues };
  }
}

export const cartService = new CartService();
