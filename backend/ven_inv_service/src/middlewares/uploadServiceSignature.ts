import multer from 'multer';
import multerS3 from 'multer-s3';
import { Request } from 'express';
import { r2 } from '../config/r2';
import { AppError } from '../errors/appError';

// Proof of a customer's off-system approval — a photo or scan of a
// physically-signed estimate/quotation. Private, durable R2 storage, same as
// contract agreements and lot documents; never local disk.
export const uploadServiceSignature = multer({
  storage: multerS3({
    s3: r2,
    bucket: process.env.R2_BUCKET!,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req: Request, file, cb) => {
      const id = req.params.estimateId || req.params.id;
      const fileName = `service-signatures/${id}/${Date.now()}-${file.originalname}`;
      cb(null, fileName);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
    if (!allowed) {
      return cb(new AppError('Only image or PDF files are allowed', 400));
    }
    cb(null, true);
  },
});
