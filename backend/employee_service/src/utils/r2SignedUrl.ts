import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2 } from '../config/r2';

export async function getSignedIdProofUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET!,
    Key: key,
  });

  return getSignedUrl(r2, command, {
    expiresIn: 60 * 5,
  });
}
