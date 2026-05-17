import { Router } from 'express';
import authRoutes from './auth.routes.js';
import cartRoutes from './cart.routes.js';
import productRoutes from './product.routes.js';
import orderRoutes from './order.routes.js';
import categoryRoutes from './category.routes.js';
import settingsRoutes from './settings.routes.js';
import uploadRoutes from './upload.routes.js';
import paymentRoutes from './payment.routes.js';
import cdekRoutes from './cdek.routes.js';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/cart', cartRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/categories', categoryRoutes);
router.use('/settings', settingsRoutes);

// Public upload (no auth required for uploads)
router.use('/upload', uploadRoutes);

// Payments (YuKassa)
router.use('/payments', paymentRoutes);

// CDEK delivery
router.use('/cdek', cdekRoutes);

export default router;
