// Telegram notification service - sends order notifications to admin chat

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8732439345:AAFG1-gaQ0_BrG-bTgPTxVNaKAFohnJfmvM';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-5271716155';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://brandbless.ru';

interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface OrderNotification {
  orderNumber: string;
  orderId: string;
  total: number;
  items: OrderItem[];
  customerEmail?: string;
}

export async function sendOrderNotification(order: OrderNotification): Promise<void> {
  try {
    // Build message
    const itemsList = order.items
      .map((item) => `  • ${item.productName} × ${item.quantity} — ${item.total.toLocaleString('ru-RU')} ₽`)
      .join('\n');

    const text = [
      `✅ *Новый оплаченный заказ*`,
      ``,
      `📦 Заказ: \`${order.orderNumber}\``,
      order.customerEmail ? `👤 Покупатель: ${order.customerEmail}` : '',
      ``,
      `🛍 Товары:`,
      itemsList,
      ``,
      `💰 *Итого: ${order.total.toLocaleString('ru-RU')} ₽*`,
    ].filter(Boolean).join('\n');

    // Admin orders URL
    const adminUrl = `${FRONTEND_URL.split(',')[0].trim()}/admin/orders`;

    const body = {
      chat_id: CHAT_ID,
      text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '📋 Открыть в управлении', url: adminUrl },
        ]],
      },
    };

    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[Telegram] Failed to send notification:', res.status, err);
    } else {
      console.log('[Telegram] Order notification sent for', order.orderNumber);
    }
  } catch (e) {
    console.error('[Telegram] Error sending notification:', (e as Error).message);
  }
}
