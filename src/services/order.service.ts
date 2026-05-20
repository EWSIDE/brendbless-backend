import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { OrderInput, OrderStatus, PaymentStatus } from '../types';
import { getSettings } from './settings.service.js';

const prisma = new PrismaClient();

function generateOrderNumber() {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `${num}`;
}

export class OrderService {
  async createOrder(userId: string, input: OrderInput) {
    const { items, shippingAddress, billingAddress, paymentMethod, notes, discountCode } = input;

    if (!items || items.length === 0) {
      throw new Error('Order must have at least one item');
    }

    const productIds = items.map((i) => i.productId);
    const uniqueProductIds = [...new Set(productIds)];
    const products = await prisma.product.findMany({
      where: { id: { in: uniqueProductIds }, isActive: true },
    });

    if (products.length !== uniqueProductIds.length) {
      const foundIds = products.map(p => p.id);
      const missingIds = uniqueProductIds.filter(id => !foundIds.includes(id));
      console.error('[Order] Products not found or unavailable:', missingIds, 'Requested:', uniqueProductIds, 'Found:', foundIds);
      throw new Error(`Some products not found or unavailable: ${missingIds.join(', ')}`);
    }

    const orderItems = items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return {
        productId: product.id,
        productName: product.name,
        productImage: JSON.parse(product.images || '[]')[0] || null,
        size: item.size || null,
        quantity: item.quantity,
        unitPrice: product.price,
        total: product.price * item.quantity,
      };
    });

    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    const settings = getSettings();
    const shippingCost = subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingCost;
    const tax = 0; // Цены уже включают НДС
    const discount = 0;
    const total = subtotal + shippingCost - discount;

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
          size: item.size ?? null,
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

  async getDetailedStatistics(period: string = '30d') {
    // Determine date range
    let dateFrom: Date | null = null;
    const now = new Date();
    switch (period) {
      case '7d':
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFrom = null; // all time
    }

    const dateFilter = dateFrom ? { createdAt: { gte: dateFrom } } : {};
    const paidFilter = { paymentStatus: 'PAID', ...dateFilter };

    // 1. Key metrics
    const [totalOrdersCount, revenueAgg, avgAgg] = await Promise.all([
      prisma.order.count({ where: paidFilter }),
      prisma.order.aggregate({ _sum: { total: true }, where: paidFilter }),
      prisma.order.aggregate({ _avg: { total: true }, where: paidFilter }),
    ]);

    const totalRevenue = revenueAgg._sum.total || 0;
    const averageCheck = avgAgg._avg.total || 0;

    // 2. Revenue by day (for chart)
    const paidOrders = await prisma.order.findMany({
      where: paidFilter,
      select: { createdAt: true, total: true },
      orderBy: { createdAt: 'asc' },
    });

    const revenueByDay: Record<string, { revenue: number; orders: number }> = {};
    for (const order of paidOrders) {
      const day = order.createdAt.toISOString().split('T')[0];
      if (!revenueByDay[day]) revenueByDay[day] = { revenue: 0, orders: 0 };
      revenueByDay[day].revenue += order.total;
      revenueByDay[day].orders += 1;
    }

    const chartData = Object.entries(revenueByDay).map(([date, data]) => ({
      date,
      revenue: Math.round(data.revenue),
      orders: data.orders,
    }));

    // 3. Top products (by paid orders in period)
    const paidOrderIds = await prisma.order.findMany({
      where: paidFilter,
      select: { id: true },
    });
    const orderIds = paidOrderIds.map(o => o.id);

    let topProducts: { productName: string; totalQuantity: number; totalRevenue: number }[] = [];
    if (orderIds.length > 0) {
      const itemsGrouped = await prisma.orderItem.groupBy({
        by: ['productName'],
        where: { orderId: { in: orderIds } },
        _sum: { quantity: true, total: true },
      });
      topProducts = itemsGrouped
        .map(g => ({
          productName: g.productName,
          totalQuantity: g._sum.quantity || 0,
          totalRevenue: Math.round(g._sum.total || 0),
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 15);
    }

    // 4. Items to order (from PENDING/PROCESSING paid orders - not yet shipped)
    const pendingPaidOrders = await prisma.order.findMany({
      where: {
        paymentStatus: 'PAID',
        status: { in: ['PENDING', 'PROCESSING'] },
      },
      select: { id: true },
    });
    const pendingOrderIds = pendingPaidOrders.map(o => o.id);

    let itemsToOrder: { productName: string; size: string | null; quantity: number }[] = [];
    if (pendingOrderIds.length > 0) {
      const pendingItems = await prisma.orderItem.groupBy({
        by: ['productName', 'size'],
        where: { orderId: { in: pendingOrderIds } },
        _sum: { quantity: true },
      });
      itemsToOrder = pendingItems
        .map(g => ({
          productName: g.productName,
          size: g.size,
          quantity: g._sum.quantity || 0,
        }))
        .sort((a, b) => b.quantity - a.quantity);
    }

    // 5. Orders by status
    const statusCounts = await prisma.order.groupBy({
      by: ['status'],
      where: { paymentStatus: 'PAID', ...dateFilter },
      _count: true,
    });
    const byStatus = statusCounts.map(s => ({ status: s.status, count: s._count }));

    // 6. Size statistics (all paid orders in period)
    let sizeStats: { size: string; quantity: number }[] = [];
    if (orderIds.length > 0) {
      const sizeGrouped = await prisma.orderItem.groupBy({
        by: ['size'],
        where: { orderId: { in: orderIds }, size: { not: null } },
        _sum: { quantity: true },
      });
      sizeStats = sizeGrouped
        .map(g => ({
          size: g.size || 'N/A',
          quantity: g._sum.quantity || 0,
        }))
        .sort((a, b) => b.quantity - a.quantity);
    }

    return {
      metrics: {
        totalRevenue: Math.round(totalRevenue),
        totalOrders: totalOrdersCount,
        averageCheck: Math.round(averageCheck),
      },
      chartData,
      topProducts,
      itemsToOrder,
      byStatus,
      sizeStats,
    };
  }
}

export const orderService = new OrderService();
