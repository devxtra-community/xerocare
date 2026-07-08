import multer from 'multer';
import multerS3 from 'multer-s3';
import { Request } from 'express';
import { r2 } from '../config/r2';
import { AppError } from '../errors/appError';

export const uploadReceiptFile = multer({
  storage: multerS3({
    s3: r2,
    bucket: process.env.R2_BUCKET!,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req: Request, file, cb) => {
      const fileName = `receipts/${Date.now()}-${file.originalname}`;
      cb(null, fileName);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
    if (!allowed) {
      return cb(new AppError('Only image or PDF receipts are allowed', 400));
    }
    cb(null, true);
  },
});
