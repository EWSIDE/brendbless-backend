import { Router, Response } from 'express';
import { orderService } from '../services/order.service';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

// Create order
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const order = await orderService.createOrder(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: order });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get user's orders
router.get('/my-orders', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await orderService.getUserOrders(req.user!.userId, page, limit);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get all orders (admin) - must be before /:id to avoid route conflict
router.get('/admin/all', authenticate, requireRole('ADMIN', 'MODERATOR'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await orderService.getAllOrders(page, limit, {
      status: req.query.status as string,
      userId: req.query.userId as string,
    });
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get order by ID (user's own order)
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const order = await orderService.getOrderById(req.params.id, req.user!.userId);
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// Get order by order number
router.get('/number/:orderNumber', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const order = await orderService.getOrderByNumber(req.params.orderNumber, req.user!.userId);
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// Update order item size (user can set missing size)
router.patch('/items/:itemId/size', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { size } = req.body;
    if (!size) {
      res.status(400).json({ success: false, error: 'Size is required' });
      return;
    }
    const updated = await orderService.updateOrderItemSize(req.user!.userId, req.params.itemId, size);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Admin: Update order item size (bypass ownership check)
router.patch('/admin/items/:itemId/size', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { size } = req.body;
    if (!size) {
      res.status(400).json({ success: false, error: 'Size is required' });
      return;
    }
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const updated = await prisma.orderItem.update({
      where: { id: req.params.itemId },
      data: { size },
    });
    await prisma.$disconnect();
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Cancel order
router.patch('/:id/cancel', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const order = await orderService.cancelOrder(req.params.id, req.user!.userId);
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ===== ADMIN ROUTES =====

// Get all orders (admin)
router.get('/', authenticate, requireRole('ADMIN', 'MODERATOR'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await orderService.getAllOrders(page, limit, {
      status: req.query.status as string,
      userId: req.query.userId as string,
    });
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update order status (admin)
router.patch('/:id/status', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.body;
    const order = await orderService.updateOrderStatus(req.params.id, status);
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update payment status (admin)
router.patch('/:id/payment', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { paymentStatus, paymentId } = req.body;
    const order = await orderService.updatePaymentStatus(req.params.id, paymentStatus, paymentId);
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get order stats (admin)
router.get('/admin/stats', authenticate, requireRole('ADMIN'), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await orderService.getOrderStats();
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get detailed statistics (admin)
router.get('/admin/statistics', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const period = (req.query.period as string) || '30d';
    const stats = await orderService.getDetailedStatistics(period);
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
