import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getClient() {
  return new S3Client({
    region: process.env.S3_REGION || "ap-southeast-1",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: !!process.env.S3_ENDPOINT,
    credentials: process.env.S3_ACCESS_KEY_ID
      ? {
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || ""
        }
      : undefined
  });
}

export async function makeUploadUrl(objectKey: string, contentType: string) {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error("S3_BUCKET is not configured");
  }
  const cmd = new PutObjectCommand({ Bucket: bucket, Key: objectKey, ContentType: contentType });
  const signedUrl = await getSignedUrl(getClient(), cmd, { expiresIn: 300 });
  const publicUrl = process.env.S3_PUBLIC_BASE_URL ? `${process.env.S3_PUBLIC_BASE_URL}/${objectKey}` : null;
  return { signedUrl, publicUrl };
}

export async function makeDownloadUrl(objectKey: string) {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error("S3_BUCKET is not configured");
  }
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: objectKey });
  return getSignedUrl(getClient(), cmd, { expiresIn: 300 });
}
