# BRENDBLESS Backend API

Production-ready e-commerce backend API built with Node.js, Express, TypeScript, and Prisma ORM.

## 🚀 Features

- **Authentication**: JWT-based auth with access/refresh tokens, secure cookies
- **User Management**: Registration, login, password reset, profile management
- **Cart System**: Full cart management with stock validation
- **Products**: CRUD operations with categories, filtering, search, pagination
- **Orders**: Order creation, tracking, status management
- **Security**: Rate limiting, Helmet, CORS, input validation
- **Production Ready**: Structured architecture, error handling, logging

## 📁 Project Structure

```
bless_backend/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Database seed script
├── src/
│   ├── config/            # Configuration files
│   │   ├── env.ts         # Environment variables
│   │   └── database.ts    # Prisma client setup
│   ├── controllers/       # Request handlers
│   ├── middleware/        # Express middleware
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── types/             # TypeScript types
│   └── server.ts          # Application entry point
├── .env                   # Development environment
├── .env.production        # Production environment
└── package.json
```

## 🛠️ Setup & Installation

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn

### Installation

```bash
# Navigate to backend directory
cd bless_backend

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed the database with sample data
npm run db:seed

# Start development server
npm run dev
```

The API will be available at `http://localhost:3001`

## 🔐 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/refresh` | Refresh tokens |
| POST | `/api/auth/logout` | Logout user |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |
| GET | `/api/auth/me` | Get current user |
| PATCH | `/api/auth/profile` | Update profile |
| POST | `/api/auth/change-password` | Change password |

### Cart

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cart` | Get user's cart |
| POST | `/api/cart` | Add item to cart |
| PATCH | `/api/cart/:productId` | Update item quantity |
| DELETE | `/api/cart/:productId` | Remove item |
| DELETE | `/api/cart` | Clear cart |

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get products (paginated) |
| GET | `/api/products/featured` | Get featured products |
| GET | `/api/products/on-sale` | Get products on sale |
| GET | `/api/products/:id` | Get single product |
| POST | `/api/products` | Create product (admin) |
| PATCH | `/api/products/:id` | Update product (admin) |
| DELETE | `/api/products/:id` | Delete product (admin) |

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | Get user's orders |
| GET | `/api/orders/:id` | Get single order |
| POST | `/api/orders` | Create order |
| POST | `/api/orders/:id/cancel` | Cancel order |
| GET | `/api/orders/track/:orderNumber` | Track order (guest) |

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | Get all categories |
| GET | `/api/categories/:slug` | Get category |
| POST | `/api/categories` | Create category (admin) |
| PATCH | `/api/categories/:id` | Update category (admin) |
| DELETE | `/api/categories/:id` | Delete category (admin) |

## 🔑 Test Credentials

After seeding the database:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@bless.com | Admin@123 |
| User | user@test.com | User@123 |

## 🏗️ Production Deployment

### Environment Variables

Copy `.env.production` and configure:

```bash
# Generate secure secrets
openssl rand -base64 64  # For JWT_SECRET
openssl rand -base64 64  # For COOKIE_SECRET

# Set NODE_ENV
NODE_ENV=production

# Configure database (use PostgreSQL/MySQL for production)
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# Set your domain
FRONTEND_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com
```

### Build & Deploy

```bash
# Build for production
npm run build

# Run migrations
npm run db:push

# Seed database (optional)
npm run db:seed

# Start production server
npm start
```

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start dist/server.js --name bless-api

# Setup startup script
pm2 startup
pm2 save
```

## 📚 API Documentation

Visit `/api/docs` for interactive API documentation.

## 🔒 Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Auth Rate Limiting**: 5 login attempts per 15 minutes
- **Helmet**: Security headers
- **CORS**: Configurable origin restriction
- **Input Validation**: All inputs validated with express-validator
- **Password Hashing**: bcrypt with 12 rounds
- **JWT Tokens**: Short-lived access tokens (7 days), long-lived refresh (30 days)
- **Secure Cookies**: httpOnly, secure, sameSite in production

## 📝 License

MIT
