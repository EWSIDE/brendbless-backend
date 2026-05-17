import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import crypto from 'crypto';
import path from 'path';

/**
 * Storage service supporting both Backblaze B2 and Cloudflare R2.
 *
 * Backblaze B2 (recommended for RU users — free 10GB, no card needed):
 *   B2_ENDPOINT       = https://s3.<region>.backblazeb2.com  (e.g. s3.us-west-004.backblazeb2.com)
 *   B2_REGION         = us-west-004  (your bucket region)
 *   B2_ACCESS_KEY_ID  = your keyID
 *   B2_SECRET_ACCESS_KEY = your applicationKey
 *   B2_BUCKET_NAME    = brandbless-uploads
 *   B2_PUBLIC_URL     = https://f004.backblazeb2.com/file/brandbless-uploads
 *                       (or your custom domain)
 *
 * Cloudflare R2 (alternative):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
 */

const createClient = (): S3Client => {
  // Backblaze B2
  if (process.env.B2_ENDPOINT && process.env.B2_ACCESS_KEY_ID && process.env.B2_SECRET_ACCESS_KEY) {
    return new S3Client({
      region: process.env.B2_REGION || 'us-west-004',
      endpoint: process.env.B2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.B2_ACCESS_KEY_ID,
        secretAccessKey: process.env.B2_SECRET_ACCESS_KEY,
      },
    });
  }

  // Cloudflare R2
  if (
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  ) {
    return new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }

  throw new Error(
    'No storage credentials configured. Set B2_* or R2_* environment variables.'
  );
};

const getBucket = (): string => {
  const bucket = process.env.B2_BUCKET_NAME || process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error('Missing bucket name env var (B2_BUCKET_NAME or R2_BUCKET_NAME).');
  return bucket;
};

const getPublicUrl = (filename: string): string => {
  const publicUrl = process.env.B2_PUBLIC_URL || process.env.R2_PUBLIC_URL;
  if (publicUrl) {
    // B2 public URL format: https://f004.backblazeb2.com/file/<bucket>/<key>
    // We store files under uploads/ prefix, so strip trailing slash and append
    return `${publicUrl.replace(/\/$/, '')}/${filename}`;
  }
  // Fallback: proxy through our own API
  return `/uploads/${filename}`;
};

let s3Client: S3Client | null = null;

const getClient = (): S3Client => {
  if (!s3Client) {
    s3Client = createClient();
  }
  return s3Client;
};

export interface UploadResult {
  filename: string;
  url: string;
  size: number;
  originalName: string;
}

/**
 * Upload a file buffer to cloud storage (B2 or R2).
 */
export const uploadToStorage = async (
  buffer: Buffer,
  originalName: string,
  mimetype: string,
  size: number
): Promise<UploadResult> => {
  const ext = path.extname(originalName);
  const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
  // Store under uploads/ prefix in the bucket
  const key = `uploads/${filename}`;

  const client = getClient();
  const bucket = getBucket();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      ContentLength: size,
    })
  );

  return {
    filename,
    // Public URL points directly to the file in the bucket
    url: getPublicUrl(`uploads/${filename}`),
    size,
    originalName,
  };
};

// Keep old name as alias for backward compatibility
export const uploadToR2 = uploadToStorage;

/**
 * Delete a file from cloud storage by filename.
 */
export const deleteFromStorage = async (filename: string): Promise<void> => {
  const client = getClient();
  const bucket = getBucket();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: `uploads/${filename}`,
    })
  );
};

export const deleteFromR2 = deleteFromStorage;

/**
 * Check if cloud storage is properly configured.
 */
export const isStorageConfigured = (): boolean => {
  const b2Ready = !!(
    process.env.B2_ENDPOINT &&
    process.env.B2_ACCESS_KEY_ID &&
    process.env.B2_SECRET_ACCESS_KEY &&
    process.env.B2_BUCKET_NAME
  );
  const r2Ready = !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
  return b2Ready || r2Ready;
};

// Keep old name as alias
export const isR2Configured = isStorageConfigured;
