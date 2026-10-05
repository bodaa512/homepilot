import { createWorker } from 'tesseract.js';

export interface OcrResult {
  rawText: string;
  detectedAmount?: number;
  detectedDate?: Date;
}

const IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

// Matches amounts like "1,234.50", "500", "٥٠٠" is out of scope — Arabic-Indic
// digit OCR is unreliable without a dedicated language pack, so this looks
// for Western-digit amounts, which is how prices are printed on the large
// majority of Egyptian invoices/receipts even in Arabic-language documents.
const AMOUNT_PATTERN = /\b\d{1,3}(?:[,.]\d{3})*(?:\.\d{1,2})?\b/g;

// Matches common date formats: 12/08/2025, 12-08-2025, 2025-08-12.
const DATE_PATTERN = /\b(\d{1,4})[/\-.](\d{1,2})[/\-.](\d{1,4})\b/;

function parseLikelyDate(text: string): Date | undefined {
  const match = text.match(DATE_PATTERN);
  if (!match) return undefined;

  const [, a, b, c] = match;
  // Heuristic: whichever group is 4 digits is the year.
  let year: number, month: number, day: number;
  if (a.length === 4) {
    year = Number(a);
    month = Number(b);
    day = Number(c);
  } else if (c.length === 4) {
    day = Number(a);
    month = Number(b);
    year = Number(c);
  } else {
    return undefined;
  }

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseLikelyAmount(text: string): number | undefined {
  const matches = [...text.matchAll(AMOUNT_PATTERN)].map((m) => Number(m[0].replace(/,/g, '')));
  const plausible = matches.filter((n) => n >= 10 && n <= 1_000_000);
  if (plausible.length === 0) return undefined;
  // The largest plausible number on a receipt is usually the total, not a
  // line item, a quantity, or a date fragment.
  return Math.max(...plausible);
}

const OCR_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutHandle));
}

export const OcrService = {
  supports(mimeType: string): boolean {
    return IMAGE_MIME_TYPES.has(mimeType);
  },

  /**
   * Hard-capped at OCR_TIMEOUT_MS: on a first run, Tesseract.js may need to
   * fetch its language data over the network, which can otherwise hang the
   * whole upload request indefinitely on a slow or unreachable connection.
   * A timeout here means a document upload can never take longer than this
   * to respond, even if OCR itself never finishes — it just falls back to
   * ocrStatus: 'failed' and the document still saves normally.
   */
  async extract(filePath: string): Promise<OcrResult> {
    return withTimeout(this.runExtraction(filePath), OCR_TIMEOUT_MS, 'OCR');
  },

  async runExtraction(filePath: string): Promise<OcrResult> {
    const worker = await createWorker(['eng', 'ara']);
    try {
      const {
        data: { text },
      } = await worker.recognize(filePath);
      return {
        rawText: text.trim().slice(0, 5000),
        detectedAmount: parseLikelyAmount(text),
        detectedDate: parseLikelyDate(text),
      };
    } finally {
      // Don't let a slow/hung terminate() add its own indefinite wait.
      void worker.terminate().catch(() => undefined);
    }
  },
};
