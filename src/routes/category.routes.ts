import { Router } from 'express';
import { body } from 'express-validator';
import { categoryController } from '../controllers/category.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Public routes
router.get('/', categoryController.getCategories);
router.get('/:slug', categoryController.getCategory);

// Admin routes
router.post(
  '/',
  authenticate,
  requireAdmin,
  validate([
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Category name must be between 2 and 100 characters.')
  ]),
  categoryController.createCategory
);

router.patch(
  '/:id',
  authenticate,
  requireAdmin,
  categoryController.updateCategory
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  categoryController.deleteCategory
);

export default router;
