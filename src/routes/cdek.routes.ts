import { Router, Request, Response } from 'express';
import { searchCities, getDeliveryPoints } from '../services/cdek.service.js';

const router = Router();

// GET /api/cdek/cities?q=москва
router.get('/cities', async (req: Request, res: Response) => {
  try {
    const query = String(req.query.q || '').trim();
    if (query.length < 2) {
      return res.json({ success: true, data: [] });
    }
    const cities = await searchCities(query);
    res.json({ success: true, data: cities });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'cdek error' });
  }
});

// GET /api/cdek/points?city_code=44&type=PVZ
router.get('/points', async (req: Request, res: Response) => {
  try {
    const cityCode = Number(req.query.city_code);
    if (!cityCode) {
      return res.status(400).json({ success: false, error: 'city_code required' });
    }
    const type = req.query.type as 'PVZ' | 'POSTAMAT' | undefined;
    const points = await getDeliveryPoints(cityCode, type);
    res.json({ success: true, data: points });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'cdek error' });
  }
});

export default router;
