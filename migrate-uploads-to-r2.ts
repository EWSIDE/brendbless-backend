/**
 * migrate-uploads-to-storage.ts
 *
 * Uploads all existing files from local ./uploads/ to Backblaze B2 or Cloudflare R2.
 * Run once before deploying to Railway.
 *
 * Usage:
 *   1. Fill in credentials in .env (see below)
 *   2. cd bless_backend
 *   3. npx tsx migrate-uploads-to-r2.ts
 *
 * --- Backblaze B2 .env example ---
 * B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com
 * B2_REGION=us-west-004
 * B2_ACCESS_KEY_ID=your_key_id
 * B2_SECRET_ACCESS_KEY=your_application_key
 * B2_BUCKET_NAME=brandbless-uploads
 * B2_PUBLIC_URL=https://f004.backblazeb2.com/file/brandbless-uploads
 *
 * --- Cloudflare R2 .env example ---
 * R2_ACCOUNT_ID=your_account_id
 * R2_ACCESS_KEY_ID=your_key_id
 * R2_SECRET_ACCESS_KEY=your_secret
 * R2_BUCKET_NAME=brandbless-uploads
 * R2_PUBLIC_URL=https://pub-xxxx.r2.dev
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// --- Detect which storage to use ---
let s3: S3Client;
let BUCKET_NAME: string;
let storageType: string;

if (
  process.env.B2_ENDPOINT &&
  process.env.B2_ACCESS_KEY_ID &&
  process.env.B2_SECRET_ACCESS_KEY &&
  process.env.B2_BUCKET_NAME
) {
  storageType = 'Backblaze B2';
  BUCKET_NAME = process.env.B2_BUCKET_NAME;
  s3 = new S3Client({
    region: process.env.B2_REGION || 'us-west-004',
    endpoint: process.env.B2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.B2_ACCESS_KEY_ID,
      secretAccessKey: process.env.B2_SECRET_ACCESS_KEY,
    },
  });
} else if (
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET_NAME
) {
  storageType = 'Cloudflare R2';
  BUCKET_NAME = process.env.R2_BUCKET_NAME;
  s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
} else {
  console.error('❌ No storage credentials found in .env');
  console.error('');
  console.error('For Backblaze B2, set:');
  console.error('  B2_ENDPOINT, B2_ACCESS_KEY_ID, B2_SECRET_ACCESS_KEY, B2_BUCKET_NAME');
  console.error('');
  console.error('For Cloudflare R2, set:');
  console.error('  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME');
  process.exit(1);
}

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

const uploadsDir = path.join(process.cwd(), 'uploads');

async function fileExistsInStorage(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function migrate() {
  console.log(`\n🚀 Migrating to ${storageType} — bucket: ${BUCKET_NAME}\n`);

  if (!fs.existsSync(uploadsDir)) {
    console.error(`❌ uploads/ directory not found at ${uploadsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(uploadsDir).filter((f) => f !== '.gitkeep');
  console.log(`📦 Found ${files.length} files in uploads/\n`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const filename of files) {
    const filePath = path.join(uploadsDir, filename);
    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';
    const key = `uploads/${filename}`;

    const exists = await fileExistsInStorage(key);
    if (exists) {
      console.log(`  ⏭  ${filename} — already exists, skipping`);
      skipped++;
      continue;
    }

    try {
      const buffer = fs.readFileSync(filePath);
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          ContentLength: buffer.length,
        })
      );
      console.log(`  ✅ ${filename} — uploaded (${(buffer.length / 1024).toFixed(1)} KB)`);
      uploaded++;
    } catch (err) {
      console.error(`  ❌ ${filename} — FAILED:`, err);
      failed++;
    }
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Migration to ${storageType} complete
  ✅ Uploaded : ${uploaded}
  ⏭  Skipped  : ${skipped}
  ❌ Failed   : ${failed}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  if (failed > 0) process.exit(1);
}

migrate().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
