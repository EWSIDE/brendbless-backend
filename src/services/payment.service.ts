import { orderService } from './order.service.js';
import { getYukassaConfig, getSettings } from './settings.service.js';
import { sendOrderNotification } from './telegram.service.js';

const YUKASSA_API_URL = 'https://api.yookassa.ru/v3';

function getYukassaShopId(): string {
  const config = getYukassaConfig();
  return config.shopId || process.env.YUKASSA_SHOP_ID || '';
}

function getYukassaSecretKey(): string {
  const config = getYukassaConfig();
  const key = config.secretKey || process.env.YUKASSA_SECRET_KEY || '';
  if (!key) {
    console.error('[YuKassa] YUKASSA_SECRET_KEY is not set! Payment will fail with 401.');
  }
  return key;
}

function getFrontendUrl(): string {
  const settings = getSettings();
  const url = settings.frontendUrl || process.env.FRONTEND_URL || 'https://brandbless.ru';
  // В production FRONTEND_URL может содержать несколько URL через запятую
  return url.split(',')[0].trim();
}

interface YukassaPayment {
  id: string;
  status: string;
  amount: { value: string; currency: string };
  confirmation?: { type: string; confirmation_url?: string };
  metadata?: { order_id?: string };
}

export class PaymentService {
  private getAuthHeader(): string {
    return 'Basic ' + Buffer.from(`${getYukassaShopId()}:${getYukassaSecretKey()}`).toString('base64');
  }

  async createPayment(orderId: string, amount: number, description: string, customerEmail?: string): Promise<{ paymentUrl: string; paymentId: string }> {
    const idempotenceKey = `order-${orderId}-${Date.now()}`;

    // Обрезаем description до 128 символов (лимит ЮKassa)
    const safeDescription = description.length > 128 ? description.substring(0, 128) : description;

    const body: Record<string, any> = {
      amount: {
        value: amount.toFixed(2),
        currency: 'RUB',
      },
      confirmation: {
        type: 'redirect',
        return_url: `${getFrontendUrl()}/payment-success?orderId=${orderId}`,
      },
      capture: true,
      description: safeDescription,
      metadata: {
        order_id: orderId,
      },
    };

    // Добавляем receipt только если есть email
    if (customerEmail) {
      body.receipt = {
        customer: { email: customerEmail },
        items: [{
          description: safeDescription,
          quantity: '1',
          amount: {
            value: amount.toFixed(2),
            currency: 'RUB',
          },
          vat_code: 1,
          payment_subject: 'commodity',
          payment_mode: 'full_payment',
        }],
      };
    }

    console.log('[YuKassa] Creating payment:', JSON.stringify(body, null, 2));

    const response = await fetch(`${YUKASSA_API_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getAuthHeader(),
        'Idempotence-Key': idempotenceKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[YuKassa] Create payment error:', response.status, errorData);
      throw new Error(`Ошибка создания платежа: ${response.status}`);
    }

    const payment = (await response.json()) as YukassaPayment;

    if (!payment.confirmation?.confirmation_url) {
      throw new Error('Не удалось получить ссылку на оплату');
    }

    // Save payment ID to order
    await orderService.updatePaymentStatus(orderId, 'PENDING', payment.id);

    return {
      paymentUrl: payment.confirmation.confirmation_url,
      paymentId: payment.id,
    };
  }

  async handleWebhook(body: any): Promise<void> {
    const event = body.event as string;
    const obj = body.object as YukassaPayment;

    console.log(`[YuKassa Webhook] Event: ${event}, Object ID: ${obj?.id}`);

    // Handle refund events separately
    if (event === 'refund.succeeded') {
      const paymentId = (obj as any)?.payment_id;
      if (paymentId) {
        console.log(`[YuKassa Webhook] Refund succeeded for payment ${paymentId}`);
        // Could update order status to REFUNDED if needed
      }
      return;
    }

    // For payment events
    if (!obj || !obj.metadata?.order_id) {
      console.warn('[YuKassa Webhook] No order_id in metadata');
      return;
    }

    const orderId = obj.metadata.order_id;

    switch (event) {
      case 'payment.succeeded':
        await orderService.updatePaymentStatus(orderId, 'PAID', obj.id);
        console.log(`[YuKassa] Order ${orderId} marked as PAID`);

        // Send Telegram notification
        try {
          const paidOrder = await orderService.getOrderById(orderId);
          await sendOrderNotification({
            orderNumber: paidOrder.orderNumber,
            orderId: paidOrder.id,
            total: paidOrder.total,
            items: (paidOrder.items || []).map((item: any) => ({
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
            })),
            customerEmail: undefined, // email not available in webhook context
          });
        } catch (notifErr) {
          console.error('[Telegram] Notification failed:', (notifErr as Error).message);
        }
        break;

      case 'payment.canceled':
        await orderService.updatePaymentStatus(orderId, 'FAILED', obj.id);
        console.log(`[YuKassa] Order ${orderId} marked as FAILED`);
        break;

      case 'payment.waiting_for_capture':
        // Auto-capture is enabled, but log it
        console.log(`[YuKassa] Order ${orderId} waiting for capture — auto-capture should handle this`);
        break;

      default:
        console.log(`[YuKassa Webhook] Unhandled event: ${event}`);
    }
  }
}

export const paymentService = new PaymentService();
