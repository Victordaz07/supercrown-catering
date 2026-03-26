/**
 * Shared upload/delete for product images (Firebase GCS, Vercel Blob, or inline data URL).
 */

import { adminStorage } from "@/lib/firebase/admin";

export function firebaseStorageConfigured(): boolean {
  const required = [
    "FIREBASE_ADMIN_PROJECT_ID",
    "FIREBASE_ADMIN_CLIENT_EMAIL",
    "FIREBASE_ADMIN_PRIVATE_KEY",
    "FIREBASE_ADMIN_STORAGE_BUCKET",
  ] as const;
  return required.every((k) => Boolean(process.env[k]?.trim()));
}

export function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export function extFromMime(mime: string | undefined): "jpg" | "png" | "webp" {
  const m = (mime ?? "").toLowerCase();
  if (m === "image/png") return "png";
  if (m === "image/webp") return "webp";
  return "jpg";
}

export function extractGcsObjectPath(imageUrl: string, bucketName: string): string | null {
  try {
    const url = new URL(imageUrl);
    if (url.hostname !== "storage.googleapis.com") return null;
    const parts = url.pathname.replace(/^\/+/, "").split("/");
    const [bucket, ...rest] = parts;
    if (!bucket || bucket !== bucketName) return null;
    const objPath = rest.join("/");
    return objPath || null;
  } catch {
    return null;
  }
}

export function isVercelBlobUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export function isDataUrl(url: string): boolean {
  return url.startsWith("data:image/");
}

const INLINE_IMAGE_MAX_BYTES = 512 * 1024;

async function deleteVercelBlobUrl(url: string): Promise<void> {
  if (!isVercelBlobUrl(url) || !hasBlobToken()) return;
  try {
    const { del } = await import("@vercel/blob");
    await del(url);
  } catch (err) {
    console.error("delete vercel blob:", err);
  }
}

/** Remove a file from GCS, Blob, or noop for data URLs. */
export async function deleteStoredProductImage(url: string | null | undefined): Promise<void> {
  if (!url || isDataUrl(url)) return;
  await deleteVercelBlobUrl(url);
  if (!firebaseStorageConfigured()) return;
  try {
    const bucket = adminStorage.bucket();
    const objectPath = extractGcsObjectPath(url, bucket.name);
    if (objectPath) {
      await bucket.file(objectPath).delete({ ignoreNotFound: true });
    }
  } catch (err) {
    console.error("delete GCS object:", err);
  }
}

export type UploadProductFileOptions = {
  /** Delete this blob URL after successful upload (e.g. old image hosted on Blob). */
  cleanupPreviousUrl?: string | null;
  /** Delete this object path in GCS after upload (e.g. old file when extension changed). */
  cleanupGcsObjectPath?: string | null;
};

/**
 * Upload bytes to configured storage. Returns public URL or data: URL.
 */
export async function uploadProductFile(
  fileBuffer: Buffer,
  contentType: string,
  objectPath: string,
  options?: UploadProductFileOptions
): Promise<string> {
  const storageOk = firebaseStorageConfigured();
  const blobOk = hasBlobToken();

  if (storageOk) {
    const bucket = adminStorage.bucket();
    try {
      const blob = bucket.file(objectPath);
      await blob.save(fileBuffer, { metadata: { contentType } });
      await blob.makePublic();
      if (options?.cleanupGcsObjectPath && options.cleanupGcsObjectPath !== objectPath) {
        await bucket.file(options.cleanupGcsObjectPath).delete({ ignoreNotFound: true });
      }
    } catch (err) {
      console.error("uploadProductFile GCS error:", err);
      throw new Error("GCS_UPLOAD_FAILED");
    }
    if (options?.cleanupPreviousUrl) {
      await deleteVercelBlobUrl(options.cleanupPreviousUrl);
    }
    return `https://storage.googleapis.com/${bucket.name}/${objectPath}`;
  }

  if (blobOk) {
    try {
      const { put } = await import("@vercel/blob");
      const uploaded = await put(objectPath, fileBuffer, {
        access: "public",
        contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      if (options?.cleanupPreviousUrl) {
        await deleteVercelBlobUrl(options.cleanupPreviousUrl);
      }
      return uploaded.url;
    } catch (err) {
      console.error("uploadProductFile Blob error:", err);
      throw new Error("BLOB_UPLOAD_FAILED");
    }
  }

  if (fileBuffer.length > INLINE_IMAGE_MAX_BYTES) {
    throw new Error("INLINE_TOO_LARGE");
  }
  if (options?.cleanupPreviousUrl) {
    await deleteVercelBlobUrl(options.cleanupPreviousUrl);
  }
  return `data:${contentType};base64,${fileBuffer.toString("base64")}`;
}
