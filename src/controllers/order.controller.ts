import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { orderService } from '../services/order.service.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';

export class OrderController {
  // Create order
  createOrder = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
        });
        return;
      }

      const userId = req.user?.id || null;
      const order = await orderService.createOrder(userId, req.body);

      res.status(201).json({
        success: true,
        data: order,
        message: 'Order created successfully.'
      });
    } catch (error) {
      next(error);
    }
  };

  // Get user's orders
  getOrders = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const result = await orderService.getOrders(req.user!.id, page, limit);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  };

  // Get single order
  getOrder = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>, next: NextFunction): Promise<void> => {
    try {
      const { orderId } = req.params;
      const order = await orderService.getOrder(orderId, req.user!.id);

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      next(error);
    }
  };

  // Get order by number (for guests)
  getOrderByNumber = async (req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction): Promise<void> => {
    try {
      const { orderNumber } = req.params;
      const { email } = req.query;
      
      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email is required to view order.'
        });
        return;
      }

      const order = await orderService.getOrderByNumber(orderNumber, email as string);

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      next(error);
    }
  };

  // Cancel order
  cancelOrder = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>, next: NextFunction): Promise<void> => {
    try {
      const { orderId } = req.params;
      const order = await orderService.cancelOrder(orderId, req.user!.id);

      res.json({
        success: true,
        data: order,
        message: 'Order cancelled successfully.'
      });
    } catch (error) {
      next(error);
    }
  };

  // Admin: Get all orders
  getAllOrders = async (req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      
      const result = await orderService.getAllOrders(page, limit, status);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  };

  // Admin: Update order status
  updateOrderStatus = async (req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction): Promise<void> => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      
      const order = await orderService.updateOrderStatus(orderId, status);

      res.json({
        success: true,
        data: order,
        message: 'Order status updated.'
      });
    } catch (error) {
      next(error);
    }
  };
}

export const orderController = new OrderController();
