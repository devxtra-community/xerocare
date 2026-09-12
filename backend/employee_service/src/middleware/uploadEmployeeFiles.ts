import multer from 'multer';
import multerS3 from 'multer-s3';
import { r2 } from '../config/r2';
import { Request } from 'express';

/**
 * Multi-document upload (passport, visa, contract, …). One file per request
 * under the field `file`; stored private in `employee-documents/`.
 */
export const uploadEmployeeDocument = multer({
  storage: multerS3({
    s3: r2,
    bucket: process.env.R2_BUCKET!,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (_req: Request, file, cb) => {
      const safeName = file.originalname.replace(/[^\w.\-() ]+/g, '_');
      cb(null, `employee-documents/${Date.now()}-${safeName}`);
    },
    acl: (_req, _file, cb) => cb(null, 'private'),
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
});

export const uploadEmployeeFiles = multer({
  storage: multerS3({
    s3: r2,
    bucket: process.env.R2_BUCKET!,
    contentType: multerS3.AUTO_CONTENT_TYPE,

    key: (req: Request, file, cb) => {
      const isProfile = file.fieldname === 'profile_image';

      const folder = isProfile ? 'profile-images' : 'id-proofs';

      const fileName = `${Date.now()}-${file.originalname}`;

      cb(null, `${folder}/${fileName}`);
    },

    acl: (req, file, cb) => {
      if (file.fieldname === 'profile_image') {
        cb(null, 'public-read');
      } else {
        cb(null, 'private');
      }
    },
  }),
});
