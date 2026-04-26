import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAppSettings } from "@/lib/settings/store";

type StorageConfig = {
  region: string;
  endpoint?: string;
  forcePathStyle: boolean;
  bucket: string;
  publicBaseUrl: string;
};

async function resolveStorageConfig(): Promise<StorageConfig> {
  const settings = await getAppSettings().catch(() => null);
  const endpoint = settings?.storage.endpoint || process.env.S3_ENDPOINT || "";
  const region = settings?.storage.region || process.env.S3_REGION || "ap-southeast-1";
  const bucket = settings?.storage.bucket || process.env.S3_BUCKET || "";
  const publicBaseUrl = settings?.storage.publicBaseUrl || process.env.S3_PUBLIC_BASE_URL || "";

  return {
    region,
    endpoint: endpoint || undefined,
    forcePathStyle: !!endpoint,
    bucket,
    publicBaseUrl
  };
}

function getClient(config: StorageConfig) {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: process.env.S3_ACCESS_KEY_ID
      ? {
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || ""
        }
      : undefined
  });
}

function getPublicUrl(config: StorageConfig, objectKey: string) {
  return config.publicBaseUrl ? `${config.publicBaseUrl}/${objectKey}` : null;
}

export async function makeUploadUrl(objectKey: string, contentType: string) {
  const config = await resolveStorageConfig();
  if (!config.bucket) {
    throw new Error("S3_BUCKET is not configured");
  }
  const cmd = new PutObjectCommand({ Bucket: config.bucket, Key: objectKey, ContentType: contentType });
  const signedUrl = await getSignedUrl(getClient(config), cmd, { expiresIn: 300 });
  const publicUrl = getPublicUrl(config, objectKey);
  return { signedUrl, publicUrl };
}

export async function makeDownloadUrl(objectKey: string) {
  const config = await resolveStorageConfig();
  if (!config.bucket) {
    throw new Error("S3_BUCKET is not configured");
  }
  const cmd = new GetObjectCommand({ Bucket: config.bucket, Key: objectKey });
  return getSignedUrl(getClient(config), cmd, { expiresIn: 300 });
}

export async function uploadObject(objectKey: string, contentType: string, body: Buffer | Uint8Array | string) {
  const config = await resolveStorageConfig();
  if (!config.bucket) {
    throw new Error("S3_BUCKET is not configured");
  }

  const cmd = new PutObjectCommand({
    Bucket: config.bucket,
    Key: objectKey,
    ContentType: contentType,
    Body: body
  });

  await getClient(config).send(cmd);

  return {
    objectKey,
    publicUrl: getPublicUrl(config, objectKey)
  };
}
