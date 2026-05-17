import { Router, Request, Response } from 'express';
import { paymentService } from '../services/payment.service.js';
import { orderService } from '../services/order.service.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// POST /api/payments/create — создать платёж для заказа
router.post('/create', authenticate, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    const userId = (req as any).user?.id;

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'orderId обязателен' });
    }

    // Проверяем что заказ принадлежит пользователю
    const order = await orderService.getOrderById(orderId, userId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Заказ не найден' });
    }

    if (order.paymentStatus === 'PAID') {
      return res.status(400).json({ success: false, error: 'Заказ уже оплачен' });
    }

    const description = `Заказ ${order.orderNumber} — BRANDBLESS`;
    const email = (req as any).user?.email;

    const result = await paymentService.createPayment(orderId, order.total, description, email);

    return res.json({
      success: true,
      data: {
        paymentUrl: result.paymentUrl,
        paymentId: result.paymentId,
      },
    });
  } catch (error: any) {
    console.error('[Payment] Create error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Ошибка создания платежа' });
  }
});

// POST /api/payments/webhook — вебхук от ЮKassa
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    console.log('[YuKassa Webhook] Received:', JSON.stringify(req.body).substring(0, 500));
    await paymentService.handleWebhook(req.body);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[YuKassa Webhook] Error:', error.message);
    // Always return 200 to YuKassa so it doesn't retry
    return res.status(200).json({ success: false });
  }
});

// GET /api/payments/status/:orderId — проверить статус оплаты заказа
router.get('/status/:orderId', authenticate, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = (req as any).user?.id;

    const order = await orderService.getOrderById(orderId, userId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Заказ не найден' });
    }

    return res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        status: order.status,
        total: order.total,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
