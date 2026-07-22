import multer from 'multer';
import multerS3 from 'multer-s3';
import { Request } from 'express';
import { r2 } from '../config/r2';
import { AppError } from '../errors/appError';

// Shipping/customs paperwork attached to a lot (bill of lading, customs
// declaration, commercial invoice, ...). Some jurisdictions require these
// kept on file for years, so storage is the same durable R2 bucket used
// for receipts — never local disk.
export const uploadLotDocuments = multer({
  storage: multerS3({
    s3: r2,
    bucket: process.env.R2_BUCKET!,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req: Request, file, cb) => {
      const lotId = req.params.id;
      const fileName = `lot-documents/${lotId}/${Date.now()}-${file.originalname}`;
      cb(null, fileName);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed =
      file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/msword' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (!allowed) {
      return cb(new AppError('Only image, PDF or Word documents are allowed', 400));
    }
    cb(null, true);
  },
});
