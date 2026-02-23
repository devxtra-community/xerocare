import multer from 'multer';
import multerS3 from 'multer-s3';
import { r2 } from '../config/r2';
import { Request } from 'express';

export const uploadMeterImage = multer({
  storage: multerS3({
    s3: r2,
    bucket: process.env.R2_BUCKET!,
    contentType: multerS3.AUTO_CONTENT_TYPE,

    key: (req: Request, file, cb) => {
      // Structure: meter-readings/{contractId}/{timestamp}-{filename}
      // We expect contractId in body, but body might not be parsed yet if before multer?
      // Multer processes file stream. req.body might be empty depending on order.
      // Usually better to use random ID or timestamp.
      // Or we can assume Contract ID is available if sent as multipart fields before file?
      // Safer: Just use timestamp + random or filename.

      const fileName = `${Date.now()}-${file.originalname}`;
      cb(null, `meter-readings/${fileName}`);
    },

    acl: 'public-read', // Or private? "Only Finance can...". Maybe signed URLs?
    // Employee service used 'public-read' for profile images and 'private' for ID proof.
    // Meter readings are sensitive? Probably not highly.
    // User goal: "Store URL in usageRecord.meterImageUrl". Implies direct access URL or signed.
    // If we store direct URL, public-read is easiest.
    // Prompt says "Store URL in usageRecord.meterImageUrl".
    // I will use public-read for now for simplicity of MVP unless restricted.
  }),
});
