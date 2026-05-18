// Settings service - stores configuration in PostgreSQL
// Settings persist across server restarts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

// Default values (used if not in DB)
const defaults: AppSettings = {
  emailVerification: false,
  yukassaShopId: process.env.YUKASSA_SHOP_ID || '',
  yukassaSecretKey: process.env.YUKASSA_SECRET_KEY || '',
  frontendUrl: process.env.FRONTEND_URL || 'https://brandbless.ru',
  shopName: process.env.SHOP_NAME || 'BRANDBLESS',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@brandbless.ru',
  telegramManager: process.env.TELEGRAM_MANAGER || 'https://t.me/bless_mng',
  telegramChannel: process.env.TELEGRAM_CHANNEL || 'https://t.me/brandbless',
};

// In-memory cache
let cache: AppSettings | null = null;

async function loadFromDb(): Promise<AppSettings> {
  try {
    // Use raw query to avoid issues if prisma client hasn't been regenerated yet
    const rows = await prisma.$queryRaw<Array<{ key: string; value: string }>>`
      SELECT key, value FROM "Setting"
    `;
    const dbSettings: Record<string, string> = {};
    for (const row of rows) {
      dbSettings[row.key] = row.value;
    }

    cache = {
      emailVerification: dbSettings.emailVerification === 'true' ? true : (dbSettings.emailVerification === 'false' ? false : defaults.emailVerification),
      yukassaShopId: dbSettings.yukassaShopId || defaults.yukassaShopId,
      yukassaSecretKey: dbSettings.yukassaSecretKey || defaults.yukassaSecretKey,
      frontendUrl: dbSettings.frontendUrl || defaults.frontendUrl,
      shopName: dbSettings.shopName || defaults.shopName,
      supportEmail: dbSettings.supportEmail || defaults.supportEmail,
      telegramManager: dbSettings.telegramManager || defaults.telegramManager,
      telegramChannel: dbSettings.telegramChannel || defaults.telegramChannel,
    };
  } catch (e) {
    // Table doesn't exist yet — use defaults + env vars
    console.warn('[Settings] DB table not ready, using env defaults');
    cache = { ...defaults };
  }
  return cache;
}

// Initialize cache on startup
loadFromDb();

export function getSettings(): AppSettings {
  return cache ? { ...cache } : { ...defaults };
}

export function getPublicSettings() {
  const s = getSettings();
  return {
    emailVerification: s.emailVerification,
    shopName: s.shopName,
    supportEmail: s.supportEmail,
    telegramManager: s.telegramManager,
    telegramChannel: s.telegramChannel,
    frontendUrl: s.frontendUrl,
    yukassaConfigured: !!(s.yukassaShopId && s.yukassaSecretKey),
  };
}

export function getAdminSettings() {
  const s = getSettings();
  return {
    ...s,
    yukassaSecretKeyMasked: s.yukassaSecretKey
      ? '••••••' + s.yukassaSecretKey.slice(-4)
      : '',
    yukassaConfigured: !!(s.yukassaShopId && s.yukassaSecretKey),
  };
}

export async function updateSettings(newSettings: Partial<AppSettings>): Promise<AppSettings> {
  // Don't allow overwriting secret key with empty string
  if (newSettings.yukassaSecretKey === '') {
    delete newSettings.yukassaSecretKey;
  }

  // Update cache
  const current = getSettings();
  const updated = { ...current, ...newSettings };
  cache = updated;

  // Persist to DB
  try {
    const entries = Object.entries(newSettings) as [string, any][];
    for (const [key, value] of entries) {
      if (value === undefined) continue;
      const strValue = typeof value === 'boolean' ? String(value) : String(value);
      await prisma.$executeRaw`
        INSERT INTO "Setting" (id, key, value, "updatedAt")
        VALUES (${key}, ${key}, ${strValue}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = ${strValue}, "updatedAt" = NOW()
      `;
    }
  } catch (e) {
    console.error('[Settings] Failed to persist to DB:', (e as Error).message);
    // Settings still work from cache even if DB write fails
  }

  return { ...updated };
}

export function getYukassaConfig() {
  const s = getSettings();
  return {
    shopId: s.yukassaShopId,
    secretKey: s.yukassaSecretKey,
  };
}
