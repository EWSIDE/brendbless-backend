import { Router, Response } from 'express';
import { cartService } from '../services/cart.service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

// Get cart
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cart = await cartService.getCart(req.user!.userId);
    res.json({ success: true, data: cart });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get cart count
router.get('/count', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const count = await cartService.getCartCount(req.user!.userId);
    res.json({ success: true, data: { count } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Add to cart
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { productId, quantity = 1 } = req.body;
    if (!productId) {
      res.status(400).json({ success: false, error: 'Product ID is required' });
      return;
    }
    const item = await cartService.addToCart(req.user!.userId, productId, quantity);
    res.status(201).json({ success: true, data: item });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update cart item
router.put('/:productId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { quantity } = req.body;
    const item = await cartService.updateCartItem(req.user!.userId, req.params.productId, quantity);
    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Remove from cart
router.delete('/:productId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await cartService.removeFromCart(req.user!.userId, req.params.productId);
    res.json({ success: true, message: 'Item removed from cart' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Clear cart
router.delete('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await cartService.clearCart(req.user!.userId);
    res.json({ success: true, message: 'Cart cleared' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
