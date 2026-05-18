// Settings service - stores configuration in memory (persists until restart)
// In production with DB persistence, this would use Prisma

interface AppSettings {
  emailVerification: boolean;
  yukassaShopId: string;
  yukassaSecretKey: string;
  frontendUrl: string;
  shopName: string;
  supportEmail: string;
  telegramManager: string;
  telegramChannel: string;
}

let settings: AppSettings = {
  emailVerification: false,
  yukassaShopId: process.env.YUKASSA_SHOP_ID || '',
  yukassaSecretKey: process.env.YUKASSA_SECRET_KEY || '',
  frontendUrl: process.env.FRONTEND_URL || 'https://brandbless.ru',
  shopName: process.env.SHOP_NAME || 'BRANDBLESS',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@brandbless.ru',
  telegramManager: process.env.TELEGRAM_MANAGER || 'https://t.me/bless_mng',
  telegramChannel: process.env.TELEGRAM_CHANNEL || 'https://t.me/brandbless',
};

export function getSettings(): AppSettings {
  return { ...settings };
}

// Return settings without sensitive keys for public access
export function getPublicSettings() {
  return {
    emailVerification: settings.emailVerification,
    shopName: settings.shopName,
    supportEmail: settings.supportEmail,
    telegramManager: settings.telegramManager,
    telegramChannel: settings.telegramChannel,
    frontendUrl: settings.frontendUrl,
    yukassaConfigured: !!(settings.yukassaShopId && settings.yukassaSecretKey),
  };
}

// Return full settings for admin
export function getAdminSettings() {
  return {
    ...settings,
    // Mask the secret key for display
    yukassaSecretKeyMasked: settings.yukassaSecretKey
      ? '••••••' + settings.yukassaSecretKey.slice(-4)
      : '',
  };
}

export function updateSettings(newSettings: Partial<AppSettings>): AppSettings {
  // Don't allow overwriting secret key with empty string if it was set
  if (newSettings.yukassaSecretKey === '') {
    delete newSettings.yukassaSecretKey;
  }
  settings = { ...settings, ...newSettings };
  return { ...settings };
}

// Get YuKassa credentials (used by payment service)
export function getYukassaConfig() {
  return {
    shopId: settings.yukassaShopId,
    secretKey: settings.yukassaSecretKey,
  };
}
