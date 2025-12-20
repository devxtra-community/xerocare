import multer from "multer";
import multerS3 from "multer-s3";
import { r2 } from "../config/r2";
import { Request } from "express";

export const uploadEmployeeFiles = multer({
  storage: multerS3({
    s3: r2,
    bucket: process.env.R2_BUCKET!,
    contentType: multerS3.AUTO_CONTENT_TYPE,

    key: (req: Request, file, cb) => {
      const isProfile = file.fieldname === "profile_image";

      const folder = isProfile
        ? "profile-images"
        : "id-proofs";

      const fileName = `${Date.now()}-${file.originalname}`;

      cb(null, `${folder}/${fileName}`);
    },

    acl: (req, file, cb) => {
      if (file.fieldname === "profile_image") {
        cb(null, "public-read");
      } else {
        cb(null, "private");
      }
    },
  }),
});
