import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 is S3-compatible. Bucket is private, so recordings must
 * be served via short-lived presigned GETs — never the raw endpoint
 * stored on session_recordings.r2_url, which requires AWS-sigv4 on
 * every request and 403s for unauthenticated browser playback.
 */
function getR2Client(): S3Client {
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "CLOUDFLARE_R2_ENDPOINT / ACCESS_KEY_ID / SECRET_ACCESS_KEY must be set"
    );
  }
  return new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

/**
 * Sign a GET for a recording key that expires in `expiresIn` seconds.
 * Default 10 min — enough for the browser to start playback and seek,
 * short enough that a leaked URL stops working quickly.
 */
export async function signRecordingUrl(
  r2Key: string,
  expiresIn = 600
): Promise<string> {
  const bucket = process.env.CLOUDFLARE_R2_BUCKET;
  if (!bucket) throw new Error("CLOUDFLARE_R2_BUCKET must be set");

  const client = getR2Client();
  const command = new GetObjectCommand({ Bucket: bucket, Key: r2Key });
  return getSignedUrl(client, command, { expiresIn });
}
