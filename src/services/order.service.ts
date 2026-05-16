import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { OrderInput, OrderStatus, PaymentStatus } from '../types';

const prisma = new PrismaClient();

function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

export class OrderService {
  async createOrder(userId: string, input: OrderInput) {
    const { items, shippingAddress, billingAddress, paymentMethod, notes, discountCode } = input;

    if (!items || items.length === 0) {
      throw new Error('Order must have at least one item');
    }

    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true, isPublished: true },
    });

    if (products.length !== items.length) {
      throw new Error('Some products not found or unavailable');
    }

    const orderItems = items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return {
        productId: product.id,
        productName: product.name,
        productImage: JSON.parse(product.images || '[]')[0] || null,
        quantity: item.quantity,
        unitPrice: product.price,
        total: product.price * item.quantity,
      };
    });

    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    const shippingCost = subtotal >= 500 ? 0 : 50;
    const tax = subtotal * 0.2;
    const discount = 0;
    const total = subtotal + shippingCost + tax - discount;

    const shippingAddr = shippingAddress ? JSON.stringify(shippingAddress) : null;
    const billingAddr = billingAddress ? JSON.stringify(billingAddress) : null;

    const orderId = randomUUID();

    await prisma.$transaction([
      prisma.order.create({
        data: {
          id: orderId,
          orderNumber: generateOrderNumber(),
          userId,
          subtotal,
          shippingCost,
          tax,
          discount,
          discountCode,
          total,
          shippingAddress: shippingAddr,
          billingAddress: billingAddr,
          paymentMethod,
          notes,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          updatedAt: new Date(),
        },
      }),
      prisma.orderItem.createMany({
        data: orderItems.map((item) => ({
          id: randomUUID(),
          orderId,
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage ?? null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
      }),
      prisma.cartItem.deleteMany({ where: { userId } }),
    ]);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { OrderItem: true },
    });

    return { ...order!, items: order!.OrderItem };
  }

  async getUserOrders(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId },
        include: { OrderItem: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where: { userId } }),
    ]);

    const normalized = orders.map((o) => ({ ...o, items: o.OrderItem }));

    return {
      orders: normalized,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOrderById(orderId: string, userId?: string) {
    const order = await prisma.order.findFirst({
      where: userId ? { id: orderId, userId } : { id: orderId },
      include: { OrderItem: true },
    });
    if (!order) throw new Error('Order not found');
    return { ...order, items: order.OrderItem };
  }

  async getOrderByNumber(orderNumber: string, userId: string) {
    const order = await prisma.order.findFirst({
      where: { orderNumber, userId },
      include: { OrderItem: true },
    });
    if (!order) throw new Error('Order not found');
    return { ...order, items: order.OrderItem };
  }

  async cancelOrder(orderId: string, userId: string) {
    const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new Error('Order not found');
    if (!['PENDING', 'PROCESSING'].includes(order.status)) {
      throw new Error('Cannot cancel order with status: ' + order.status);
    }
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
      include: { OrderItem: true },
    });
    return { ...updated, items: updated.OrderItem };
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: { OrderItem: true },
    });
    return { ...updated, items: updated.OrderItem };
  }

  async updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus, paymentId?: string) {
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus,
        paymentId,
        ...(paymentStatus === 'PAID' ? { status: 'PROCESSING' } : {}),
      },
      include: { OrderItem: true },
    });
    return { ...updated, items: updated.OrderItem };
  }

  async getAllOrders(page = 1, limit = 20, filters?: { status?: string; userId?: string }) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.userId) where.userId = filters.userId;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          OrderItem: true,
          User: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    const normalized = orders.map((o) => ({ ...o, items: o.OrderItem }));

    return {
      orders: normalized,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOrderStats() {
    const [totalOrders, totalRevenue, pendingOrders, completedOrders] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { total: true }, where: { paymentStatus: 'PAID' } }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
    ]);
    return {
      totalOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      pendingOrders,
      completedOrders,
    };
  }
}

export const orderService = new OrderService();
