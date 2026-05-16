import { Router } from 'express';
import { body } from 'express-validator';
import { productController } from '../controllers/product.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Public routes
router.get('/', productController.getProducts);
router.get('/featured', productController.getFeatured);
router.get('/on-sale', productController.getOnSale);
router.get('/:identifier', productController.getProduct);
router.get('/:productId/related', productController.getRelated);

// Admin routes
router.post(
  '/',
  authenticate,
  requireAdmin,
  validate([
    body('name')
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage('Product name must be between 2 and 200 characters.'),
    body('price')
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number.'),
    body('compareAtPrice')
      .optional({ nullable: true })
      .isFloat({ min: 0 })
      .withMessage('Compare price must be a positive number.'),
    body('stockQuantity')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Stock must be a non-negative integer.')
  ]),
  productController.createProduct
);

router.patch(
  '/:id',
  authenticate,
  requireAdmin,
  productController.updateProduct
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  productController.deleteProduct
);

// Reorder products (admin) - batch update sortOrder
router.post(
  '/reorder',
  authenticate,
  requireAdmin,
  productController.reorderProducts
);

export default router;
