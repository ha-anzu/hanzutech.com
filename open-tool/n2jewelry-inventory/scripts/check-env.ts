import "dotenv/config";

const required = ["DATABASE_URL", "APP_BASE_URL"] as const;
const recommended = ["S3_BUCKET", "S3_REGION", "S3_ENDPOINT", "S3_PUBLIC_BASE_URL"] as const;

const missingRequired = required.filter((key) => !process.env[key] || String(process.env[key]).trim() === "");
const missingRecommended = recommended.filter((key) => !process.env[key] || String(process.env[key]).trim() === "");

if (missingRequired.length > 0) {
  console.error(`Missing required environment variables: ${missingRequired.join(", ")}`);
  process.exitCode = 1;
}

if (missingRecommended.length > 0) {
  console.warn(`Recommended environment variables not set: ${missingRecommended.join(", ")}`);
}

if (missingRequired.length === 0) {
  console.log("Environment check passed.");
}
