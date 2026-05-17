import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { uploadToR2, isR2Configured } from '../services/storage.service.js';

const router = Router();

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

// Always use memory storage — we decide where to put the file after upload
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * Resolve uploads directory.
 * Uses UPLOAD_DIR env var (Railway Volume) or falls back to ./uploads for local dev.
 */
const getUploadsDir = (): string => {
  const dir = process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

/**
 * Save file to local disk (Railway Volume or local dev fallback).
 * Used when cloud storage (B2/R2) is not configured.
 */
const saveLocally = (
  buffer: Buffer,
  originalName: string
): { filename: string; url: string; size: number } => {
  const uploadsDir = getUploadsDir();
  const ext = path.extname(originalName);
  const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(uploadsDir, filename), buffer);
  return { filename, url: `/uploads/${filename}`, size: buffer.length };
};

// Upload single file
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    let result: { filename: string; url: string; size: number; originalName?: string };

    if (isR2Configured()) {
      result = await uploadToR2(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        req.file.size
      );
    } else {
      // Dev fallback: save to local disk
      console.warn('[upload] R2 not configured, saving file locally');
      result = saveLocally(req.file.buffer, req.file.originalname);
    }

    res.json({
      success: true,
      data: {
        url: result.url,
        filename: result.filename,
        originalName: req.file.originalname,
        size: result.size,
      },
    });
  } catch (error) {
    console.error('[upload] Upload failed:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

// Upload multiple files
router.post('/multiple', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, message: 'No files uploaded' });
      return;
    }

    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        if (isR2Configured()) {
          const result = await uploadToR2(file.buffer, file.originalname, file.mimetype, file.size);
          return {
            url: result.url,
            filename: result.filename,
            originalName: file.originalname,
            size: result.size,
          };
        } else {
          console.warn('[upload] R2 not configured, saving file locally');
          const result = saveLocally(file.buffer, file.originalname);
          return {
            url: result.url,
            filename: result.filename,
            originalName: file.originalname,
            size: result.size,
          };
        }
      })
    );

    res.json({
      success: true,
      data: uploadedFiles,
    });
  } catch (error) {
    console.error('[upload] Multiple upload failed:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

export default router;
