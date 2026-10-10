import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import type { Request, Response, NextFunction } from 'express';
import sharp from 'sharp';

export interface FileValidationResult {
  isValid: boolean;
  reason?: string;
  reasonAr?: string;
}

const MAX_ALLOWED_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];
const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v'];
const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf'];

/**
 * Known magic byte signatures for common file formats
 */
function verifyMagicBytes(buffer: Buffer, ext: string, mimetype?: string): { matches: boolean; detail?: string } {
  // SVG disabled
  if (ext === '.svg' || mimetype === 'image/svg+xml') {
    return { matches: false, detail: 'SVG is disabled' };
  }

  const hex = buffer.toString('hex', 0, 8).toUpperCase();

  switch (ext) {
    case '.jpg':
    case '.jpeg':
      if (hex.startsWith('FFD8FF')) return { matches: true };
      break;
    case '.png':
      if (hex.startsWith('89504E470D0A1A0A')) return { matches: true };
      break;
    case '.gif':
      if (hex.startsWith('474946383761') || hex.startsWith('474946383961')) return { matches: true };
      break;
    case '.webp':
      if (
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      ) {
        return { matches: true };
      }
      break;
    case '.avif':
      // ISO Base Media File Format for AVIF
      if (
        buffer.subarray(4, 8).toString('ascii') === 'ftyp' &&
        (buffer.subarray(8, 12).toString('ascii') === 'avif' || buffer.subarray(8, 12).toString('ascii') === 'avis')
      ) {
        return { matches: true };
      }
      break;
    case '.pdf':
      if (hex.startsWith('255044462D')) return { matches: true };
      break;
    case '.mp4':
    case '.m4v':
    case '.mov':
      // Basic check for ftyp box (MP4/MOV)
      if (hex.substring(8, 16) === '66747970' || buffer.toString('utf8', 4, 8) === 'ftyp') {
        return { matches: true };
      }
      break;
    case '.webm':
      if (hex.startsWith('1A45DFA3')) return { matches: true };
      break;
  }

  return { matches: false, detail: `Unknown format or signature mismatch for ${ext}` };
}

/**
 * Validates file integrity on disk
 */
export async function validateFileIntegrity(file: Express.Multer.File): Promise<FileValidationResult> {
  if (!file || !file.path) {
    return {
      isValid: false,
      reason: 'No file path found for validation.',
      reasonAr: 'لم يتم العثور على المسار المرفوع للتحقق.'
    };
  }

  const ext = path.extname(file.originalname || file.filename || '').toLowerCase();
  
  if (ext === '.svg' || file.mimetype === 'image/svg+xml') {
    return {
      isValid: false,
      reason: 'SVG upload is disabled.',
      reasonAr: 'رفع SVG غير متاح لأسباب أمنية.'
    };
  }

  let stats: fs.Stats;
  try {
    stats = await fsPromises.stat(file.path);
  } catch {
    return {
      isValid: false,
      reason: 'Uploaded file could not be found on disk.',
      reasonAr: 'لم يتم العثور على الملف المرفوع على القرص.'
    };
  }

  if (stats.size === 0) {
    return {
      isValid: false,
      reason: 'Uploaded file is empty (0 bytes).',
      reasonAr: 'الملف المرفوع فارغ (0 بايت).'
    };
  }

  if (stats.size > MAX_ALLOWED_FILE_SIZE) {
    return {
      isValid: false,
      reason: `File size (${stats.size} bytes) exceeds maximum limit of 100MB.`,
      reasonAr: 'حجم الملف يتجاوز الحد الأقصى المسموح به (100 ميجابايت).'
    };
  }

  // Read header for magic bytes
  let fileHandle;
  let buffer = Buffer.alloc(32);
  try {
    fileHandle = await fsPromises.open(file.path, 'r');
    await fileHandle.read(buffer, 0, 32, 0);
  } catch (err) {
    return {
      isValid: false,
      reason: 'Could not read file header.',
      reasonAr: 'تعذر قراءة رأس الملف للتحقق من سلامته.'
    };
  } finally {
    if (fileHandle) {
      await fileHandle.close();
    }
  }

  const magicCheck = verifyMagicBytes(buffer, ext, file.mimetype);
  if (!magicCheck.matches) {
    return {
      isValid: false,
      reason: `File signature does not match expected format for extension ${ext}. ${magicCheck.detail || ''}`,
      reasonAr: `بنية الملف لا تتطابق مع امتداد ${ext} المحدد.`
    };
  }

  // Sharp verification for images
  if (ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    try {
      const metadata = await sharp(file.path, {
        animated: true,
        failOn: 'error',
        limitInputPixels: 40_000_000,
      }).metadata();
      if (!metadata.width || !metadata.height) {
        return {
          isValid: false,
          reason: 'Image has missing dimensions or is corrupt.',
          reasonAr: 'الصورة تالفة أو تفتقد للأبعاد.'
        };
      }
    } catch (err: any) {
      return {
        isValid: false,
        reason: `Image processing failed: ${err.message}`,
        reasonAr: 'فشلت معالجة الصورة. يبدو أن الملف تالف.'
      };
    }
  }

  return { isValid: true };
}

/**
 * Express Middleware: Inspects req.file or req.files after upload, validates integrity,
 * and automatically purges corrupt files from disk before route handling.
 */
export async function uploadValidator(req: Request, res: Response, next: NextFunction): Promise<void> {
  const filesToValidate: Express.Multer.File[] = [];

  if (req.file) {
    filesToValidate.push(req.file);
  }

  if (req.files) {
    if (Array.isArray(req.files)) {
      filesToValidate.push(...req.files);
    } else if (typeof req.files === 'object') {
      for (const key of Object.keys(req.files)) {
        const fieldFiles = (req.files as Record<string, Express.Multer.File[]>)[key];
        if (Array.isArray(fieldFiles)) {
          filesToValidate.push(...fieldFiles);
        }
      }
    }
  }

  if (filesToValidate.length === 0) {
    return next();
  }

  for (const file of filesToValidate) {
    const result = await validateFileIntegrity(file);
    if (!result.isValid) {
      console.warn(`[Upload Validator] Corrupt or invalid file rejected: ${file.originalname || file.filename}. Reason: ${result.reason}`);

      for (const cleanupFile of filesToValidate) {
        if (cleanupFile.path && fs.existsSync(cleanupFile.path)) {
          await fsPromises.unlink(cleanupFile.path).catch((unlinkErr) => {
            console.error(`[Upload Validator] Error unlinking corrupt file ${cleanupFile.path}:`, unlinkErr);
          });
        }
      }

      res.status(400).json({
        error: result.reasonAr || 'الملف المرفوع تالف أو يحتوي على بنية غير صالحة.',
        errorEn: result.reason || 'The uploaded file is corrupt or has an invalid header/structure.',
        details: result.reason
      });
      return;
    }
  }

  next();
}

export const validateUploadedFiles = uploadValidator;
