import { Router, Request, Response } from 'express';
import { getPublicSettings, getAdminSettings, updateSettings } from '../services/settings.service.js';

const router = Router();

// GET /api/settings - получить публичные настройки
router.get('/', (_req: Request, res: Response) => {
  try {
    const settings = getPublicSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get settings' });
  }
});

// GET /api/settings/admin - получить все настройки (только админ)
router.get('/admin', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const settings = getAdminSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get settings' });
  }
});

// PUT /api/settings - обновить настройки (только админ)
router.put('/', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const settings = updateSettings(req.body);
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

export default router;
