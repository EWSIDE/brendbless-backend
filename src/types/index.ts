import { Request } from 'express';

export type UserRole = 'USER' | 'ADMIN' | 'MODERATOR';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId?: string;
    email: string;
    role: UserRole;
  };
}

export interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role: 'USER' | 'ADMIN' | 'MODERATOR';
  avatar?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AddressType = 'SHIPPING' | 'BILLING';
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface Address {
  id: string;
  userId: string;
  type: AddressType;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddressInput {
  type?: AddressType;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  isDefault?: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  parentId?: string | null;
  children?: Category[];
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo?: string | null;
  website?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  sku?: string | null;
  barcode?: string | null;
  stockQuantity: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  weight?: number | null;
  dimensions?: string | null;
  images: string;
  tags: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  isActive: boolean;
  isFeatured: boolean;
  isPublished: boolean;
  brandId?: string | null;
  brand?: Brand | null;
  categoryId?: string | null;
  category?: Category | null;
  createdAt: Date;
  updatedAt: Date;
  averageRating?: number;
  reviewCount?: number;
}

export interface CartItem {
  id: string;
  userId: string;
  productId: string;
  product?: Product;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  user?: User;
  status: OrderStatus;
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  discountCode?: string | null;
  total: number;
  shippingAddress?: string | null;
  billingAddress?: string | null;
  paymentMethod?: string | null;
  paymentStatus: PaymentStatus;
  paymentId?: string | null;
  notes?: string | null;
  trackingNumber?: string | null;
  items?: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  product?: Product;
  productName: string;
  productImage?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface OrderInput {
  items: { productId: string; quantity: number }[];
  shippingAddress?: AddressInput;
  billingAddress?: AddressInput;
  paymentMethod?: string;
  notes?: string;
  discountCode?: string;
}

export interface Review {
  id: string;
  userId: string;
  user?: User;
  productId: string;
  product?: Product;
  rating: number;
  title?: string | null;
  comment?: string | null;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  product?: Product;
  createdAt: Date;
}

// Auth types
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  accessToken: string;
  refreshToken: string;
}

// Pagination & Filters
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface ProductFilters extends PaginationQuery {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  inStock?: boolean;
  isFeatured?: boolean;
  search?: string;
  tags?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Address stored as JSON string
export interface AddressData {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// Product DTOs
export interface ProductQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price' | 'name' | 'createdAt' | 'sortOrder';
  sortOrder?: 'asc' | 'desc';
  featured?: boolean;
  onSale?: boolean;
  isActive?: boolean;
}

export interface CreateProductDto {
  name: string;
  slug?: string;
  description?: string;
  price: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  sku?: string;
  stock?: number;
  stockQuantity?: number;
  images?: string[] | string;
  attributes?: Record<string, any>;
  tags?: string[];
  categoryId?: string;
  brandId?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  isPublished?: boolean;
}

export interface UpdateProductDto {
  name?: string;
  slug?: string;
  description?: string;
  price?: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  sku?: string;
  stock?: number;
  stockQuantity?: number;
  images?: string[] | string;
  attributes?: Record<string, any>;
  tags?: string[];
  categoryId?: string;
  brandId?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  isPublished?: boolean;
}
