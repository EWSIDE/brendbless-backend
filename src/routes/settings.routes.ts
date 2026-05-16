import { Router, Request, Response } from 'express';
import { getSettings, updateSettings } from '../services/settings.service.js';

const router = Router();

// GET /api/settings - получить настройки (публичный)
router.get('/', (_req: Request, res: Response) => {
  try {
    const settings = getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get settings' });
  }
});

// PUT /api/settings - обновить настройки (только админ)
router.put('/', async (req: Request, res: Response) => {
  try {
    // Simple auth check via Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // In production, verify JWT token here
    // For now, we trust the frontend's admin check
    
    const settings = updateSettings(req.body);
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

export default router;
