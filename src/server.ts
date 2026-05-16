import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';

import { config } from './config/env.js';
import { connectDatabase } from './config/database.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

const app: Express = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false
}));

// CORS
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Refresh-Token'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Compression
app.use(compression());

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(config.cookie.secret));

// Logging
if (config.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Static files (uploads)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Rate limiting
app.use('/api', apiLimiter);

// API routes
app.use('/api', routes);

// API documentation endpoint
app.get('/api/docs', (_req, res) => {
  res.json({
    name: 'BRENDBLESS API',
    version: '1.0.0',
    description: 'E-commerce Backend API',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/login': 'Login user',
        'POST /api/auth/refresh': 'Refresh tokens',
        'POST /api/auth/logout': 'Logout user',
        'POST /api/auth/forgot-password': 'Request password reset',
        'POST /api/auth/reset-password': 'Reset password with token',
        'GET /api/auth/me': 'Get current user (auth required)',
        'PATCH /api/auth/profile': 'Update profile (auth required)',
        'POST /api/auth/change-password': 'Change password (auth required)'
      },
      cart: {
        'GET /api/cart': 'Get cart (auth required)',
        'POST /api/cart': 'Add item to cart (auth required)',
        'PATCH /api/cart/:productId': 'Update cart item (auth required)',
        'DELETE /api/cart/:productId': 'Remove from cart (auth required)',
        'DELETE /api/cart': 'Clear cart (auth required)',
        'GET /api/cart/validate': 'Validate cart (auth required)'
      },
      products: {
        'GET /api/products': 'Get products (paginated)',
        'GET /api/products/featured': 'Get featured products',
        'GET /api/products/on-sale': 'Get products on sale',
        'GET /api/products/:id': 'Get single product',
        'GET /api/products/:id/related': 'Get related products',
        'POST /api/products': 'Create product (admin)',
        'PATCH /api/products/:id': 'Update product (admin)',
        'DELETE /api/products/:id': 'Delete product (admin)'
      },
      orders: {
        'GET /api/orders': 'Get user orders (auth required)',
        'GET /api/orders/:id': 'Get single order (auth required)',
        'POST /api/orders': 'Create order (auth required)',
        'POST /api/orders/:id/cancel': 'Cancel order (auth required)',
        'GET /api/orders/track/:orderNumber': 'Track order (guest)',
        'GET /api/orders/admin/all': 'Get all orders (admin)',
        'PATCH /api/orders/admin/:id/status': 'Update order status (admin)'
      },
      categories: {
        'GET /api/categories': 'Get all categories',
        'GET /api/categories/:slug': 'Get category by slug',
        'POST /api/categories': 'Create category (admin)',
        'PATCH /api/categories/:id': 'Update category (admin)',
        'DELETE /api/categories/:id': 'Delete category (admin)'
      }
    }
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase();

    // Create uploads directory if not exists
    const fs = await import('fs');
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Start listening on 0.0.0.0 (required for containerized environments like Railway)
    app.listen(config.port, '0.0.0.0', () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 BRENDBLESS API Server Started!                       ║
║                                                            ║
║   Environment: ${config.nodeEnv.padEnd(42)}║
║   Port:        ${String(config.port).padEnd(42)}║
║   API URL:     ${config.apiUrl.padEnd(42)}║
║   Frontend:    ${config.frontendUrl.padEnd(42)}║
║                                                            ║
║   Endpoints:                                               ║
║   • Health:   ${`${config.apiUrl}/api/health`.padEnd(42)}║
║   • Docs:     ${`${config.apiUrl}/api/docs`.padEnd(42)}║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
