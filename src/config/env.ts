import dotenv from 'dotenv';
import path from 'path';

// Load .env file only in development (in production, env vars are injected by the platform)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  
  cookie: {
    secret: process.env.COOKIE_SECRET || 'cookie-secret-change-in-production',
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
    dir: process.env.UPLOAD_DIR || './uploads',
  },

  // Backblaze B2 (recommended: free 10GB, no card needed)
  // Sign up at https://www.backblaze.com/b2/sign-up.html
  b2: {
    endpoint: process.env.B2_ENDPOINT || '',        // e.g. https://s3.us-west-004.backblazeb2.com
    region: process.env.B2_REGION || 'us-west-004',
    accessKeyId: process.env.B2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.B2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.B2_BUCKET_NAME || '',
    // e.g. https://f004.backblazeb2.com/file/brandbless-uploads
    publicUrl: process.env.B2_PUBLIC_URL || '',
  },

  // Cloudflare R2 (alternative, requires non-RU card)
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_BUCKET_NAME || '',
    publicUrl: process.env.R2_PUBLIC_URL || '',
  },
  
  cors: {
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map((o) => o.trim())
      : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  },
  
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
} as const;

export type Config = typeof config;
