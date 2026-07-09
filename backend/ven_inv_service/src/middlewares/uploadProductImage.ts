import multer from 'multer';
import multerS3 from 'multer-s3';
import { r2 } from '../config/r2';
import { Request } from 'express';

export const uploadProductImage = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req: Request, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
  storage: multerS3({
    s3: r2,
    bucket: process.env.R2_BUCKET!,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req: Request, file, cb) => {
      const fileName = `products/${Date.now()}-${file.originalname}`;
      cb(null, fileName);
    },
  }),
});
