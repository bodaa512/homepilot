import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request } from 'express';
import { UploadError } from '../errors/specificErrors';

export const UPLOADS_ROOT = path.join(__dirname, '../../uploads');

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const storage = multer.diskStorage({
  destination: (req: Request, _file, cb) => {
    const homeId = req.params.homeId;
    const dir = path.join(UPLOADS_ROOT, homeId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const safeName = `${crypto.randomUUID()}${path.extname(file.originalname)}`;
    cb(null, safeName);
  },
});

export const uploadDocument = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new UploadError(`File type not allowed: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
}).single('file');
