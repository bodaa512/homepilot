import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { UPLOADS_ROOT } from '../middleware/upload.middleware';

export interface StoredFile {
  storageType: 'local' | 'cloudinary';
  storagePath: string; // relative disk path, or a full Cloudinary URL
}

function isCloudinaryConfigured(): boolean {
  return Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);
}

let configured = false;
function ensureCloudinaryConfigured(): void {
  if (configured) return;
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
  configured = true;
}

export const StorageService = {
  isCloudEnabled: isCloudinaryConfigured,

  /**
   * Takes a file multer already saved to local disk. If Cloudinary is
   * configured, uploads it there and removes the local copy; otherwise
   * leaves it on disk and returns its path relative to the uploads root.
   */
  async persist(localAbsolutePath: string, homeId: string): Promise<StoredFile> {
    if (!isCloudinaryConfigured()) {
      return { storageType: 'local', storagePath: path.relative(UPLOADS_ROOT, localAbsolutePath) };
    }

    ensureCloudinaryConfigured();
    const result = await cloudinary.uploader.upload(localAbsolutePath, {
      folder: `homepilot/${homeId}`,
      resource_type: 'auto',
    });

    await fs.promises.unlink(localAbsolutePath).catch(() => undefined);

    return { storageType: 'cloudinary', storagePath: result.secure_url };
  },

  async remove(file: { storageType: 'local' | 'cloudinary'; storagePath: string }): Promise<void> {
    if (file.storageType === 'local') {
      const absolutePath = path.join(UPLOADS_ROOT, file.storagePath);
      await fs.promises.unlink(absolutePath).catch(() => undefined);
      return;
    }

    ensureCloudinaryConfigured();
    // Cloudinary needs the public_id, not the URL — derive it from the URL
    // structure we control (folder/homeId/filename-without-extension).
    const publicId = file.storagePath.split('/upload/')[1]?.replace(/\.[^./]+$/, '');
    if (publicId) {
      await cloudinary.uploader.destroy(publicId).catch(() => undefined);
    }
  },
};
