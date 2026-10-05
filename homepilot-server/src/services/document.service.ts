import fs from 'fs';
import path from 'path';
import { Document, IDocument } from '../models/Document';
import { NotFoundError, ValidationError } from '../errors/specificErrors';
import { assertHomeAccess } from './authorization.service';
import { UPLOADS_ROOT } from '../middleware/upload.middleware';
import { StorageService } from './storage.service';
import { OcrService } from '../ai/ocrService';
import { AchievementService } from './achievement.service';

export const DocumentService = {
  async listForHome(userId: string, homeId: string) {
    await assertHomeAccess(userId, homeId);
    return Document.find({ home: homeId }).populate('asset', 'name').sort({ createdAt: -1 });
  },

  async create(
    userId: string,
    homeId: string,
    file: Express.Multer.File,
    input: { type?: string; asset?: string; expirationDate?: Date },
  ) {
    await assertHomeAccess(userId, homeId, 'assets:manage');

    const canRunOcr = OcrService.supports(file.mimetype);

    // OCR runs on the local temp file BEFORE it's moved to Cloudinary (or
    // left in place for local storage) — it needs a real file on disk
    // either way, and the local path is guaranteed to exist at this point.
    let ocrResult: { rawText: string; detectedAmount?: number; detectedDate?: Date } | null = null;
    let ocrStatus: IDocument['ocrStatus'] = 'skipped';
    if (canRunOcr) {
      ocrStatus = 'processing';
      try {
        ocrResult = await OcrService.extract(file.path);
        ocrStatus = 'done';
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[ocr] extraction failed:', error);
        ocrStatus = 'failed';
      }
    }

    const stored = await StorageService.persist(file.path, homeId);

    const doc = await Document.create({
      home: homeId,
      asset: input.asset || undefined,
      type: input.type || 'other',
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storagePath: stored.storagePath,
      storageType: stored.storageType,
      expirationDate: input.expirationDate ?? ocrResult?.detectedDate,
      uploadedBy: userId,
      extractedText: ocrResult?.rawText,
      extractedAmount: ocrResult?.detectedAmount,
      extractedDate: ocrResult?.detectedDate,
      ocrStatus,
    });

    const documentCount = await Document.countDocuments({ home: homeId });
    await AchievementService.checkDocumentMilestones(userId, documentCount);

    return doc;
  },

  async getForDownload(userId: string, documentId: string): Promise<{ doc: IDocument; absolutePath?: string; redirectUrl?: string }> {
    const doc = await Document.findById(documentId);
    if (!doc) throw new NotFoundError('Document not found');
    await assertHomeAccess(userId, doc.home.toString());

    if (doc.storageType === 'cloudinary') {
      return { doc, redirectUrl: doc.storagePath };
    }

    const absolutePath = path.join(UPLOADS_ROOT, doc.storagePath);
    if (!absolutePath.startsWith(UPLOADS_ROOT)) {
      // Defends against a path-traversal storagePath ever making it this far.
      throw new ValidationError('Invalid document path');
    }
    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundError('The file for this document is missing from storage');
    }

    return { doc, absolutePath };
  },

  async delete(userId: string, documentId: string) {
    const doc = await Document.findById(documentId);
    if (!doc) throw new NotFoundError('Document not found');
    await assertHomeAccess(userId, doc.home.toString(), 'assets:manage');

    await StorageService.remove({ storageType: doc.storageType, storagePath: doc.storagePath });
    await doc.deleteOne();
  },
};
