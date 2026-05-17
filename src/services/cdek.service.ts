/**
 * CDEK API integration service
 * Docs: https://api-docs.cdek.ru/
 */

const CDEK_API_URL = process.env.CDEK_API_URL || 'https://api.cdek.ru/v2';
const CDEK_CLIENT_ID = process.env.CDEK_CLIENT_ID || '';
const CDEK_CLIENT_SECRET = process.env.CDEK_CLIENT_SECRET || '';

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CDEK_CLIENT_ID,
    client_secret: CDEK_CLIENT_SECRET,
  });

  const res = await fetch(`${CDEK_API_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    throw new Error(`CDEK auth failed: ${res.status}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // refresh 60s before expiry
  };

  return cachedToken.token;
}

export interface CdekCity {
  code: number;
  city: string;
  region: string;
  country: string;
}

export async function searchCities(query: string): Promise<CdekCity[]> {
  const token = await getToken();

  const res = await fetch(`${CDEK_API_URL}/location/cities?city=${encodeURIComponent(query)}&size=20&country_codes=RU,KZ,BY`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`CDEK cities error: ${res.status}`);
  }

  const data = await res.json() as any[];
  return data.map((c: any) => ({
    code: c.code,
    city: c.city,
    region: c.region,
    country: c.country,
  }));
}

export interface CdekPoint {
  code: string;
  name: string;
  address: string;
  type: 'PVZ' | 'POSTAMAT';
  workTime: string;
}

export async function getDeliveryPoints(cityCode: number, type?: 'PVZ' | 'POSTAMAT'): Promise<CdekPoint[]> {
  const token = await getToken();

  let url = `${CDEK_API_URL}/deliverypoints?city_code=${cityCode}&size=50`;
  if (type) {
    url += `&type=${type}`;
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`CDEK points error: ${res.status}`);
  }

  const data = await res.json() as any[];
  return data.map((p: any) => ({
    code: p.code,
    name: p.name || p.code,
    address: p.location?.address_full || p.location?.address || '',
    type: p.type === 'POSTAMAT' ? 'POSTAMAT' : 'PVZ',
    workTime: p.work_time || '',
  }));
}
