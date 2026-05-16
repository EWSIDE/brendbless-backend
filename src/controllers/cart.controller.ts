import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { cartService } from '../services/cart.service.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';

export class CartController {
  // Get cart
  getCart = async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const cart = await cartService.getCart(req.user!.id);

      res.json({
        success: true,
        data: cart
      });
    } catch (error) {
      next(error);
    }
  };

  // Add to cart
  addToCart = async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
        });
        return;
      }

      const { productId, quantity = 1 } = req.body;
      const cart = await cartService.addToCart(req.user!.id, productId, quantity);

      res.json({
        success: true,
        data: cart,
        message: 'Item added to cart.'
      });
    } catch (error) {
      next(error);
    }
  };

  // Update cart item
  updateCartItem = async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
        });
        return;
      }

      const { productId } = req.params;
      const { quantity } = req.body;

      const cart = await cartService.updateCartItem(req.user!.id, productId, quantity);

      res.json({
        success: true,
        data: cart,
        message: 'Cart updated.'
      });
    } catch (error) {
      next(error);
    }
  };

  // Remove from cart
  removeFromCart = async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const { productId } = req.params;
      const cart = await cartService.removeFromCart(req.user!.id, productId);

      res.json({
        success: true,
        data: cart,
        message: 'Item removed from cart.'
      });
    } catch (error) {
      next(error);
    }
  };

  // Clear cart
  clearCart = async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const cart = await cartService.clearCart(req.user!.id);

      res.json({
        success: true,
        data: cart,
        message: 'Cart cleared.'
      });
    } catch (error) {
      next(error);
    }
  };

  // Validate cart
  validateCart = async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const validation = await cartService.validateCart(req.user!.id);

      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      next(error);
    }
  };
}

export const cartController = new CartController();
