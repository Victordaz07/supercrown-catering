/**
 * Client-only: resizes and re-encodes images so they fit the inline-storage limit
 * when the server has no Firebase / Vercel Blob (see app/api/products/[id]/image/route.ts).
 */

export const INLINE_UPLOAD_TARGET_BYTES = 480 * 1024; // stay under server 512 KB limit

export async function compressProductImageForUpload(
  file: File,
  maxBytes: number = INLINE_UPLOAD_TARGET_BYTES
): Promise<File> {
  if (typeof window === "undefined") {
    throw new Error("compressProductImageForUpload must run in the browser");
  }

  if (file.size <= maxBytes) {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("No se pudo leer la imagen. Prueba con JPG o PNG.");
  }

  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas no disponible");
    }

    let w = bitmap.width;
    let h = bitmap.height;
    const maxDim = 1920;

    if (w > maxDim || h > maxDim) {
      const s = Math.min(maxDim / w, maxDim / h);
      w = Math.max(1, Math.round(w * s));
      h = Math.max(1, Math.round(h * s));
    }

    const encode = (width: number, height: number, quality: number): Promise<Blob | null> => {
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(bitmap, 0, 0, width, height);
      return new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
      });
    };

    const baseName = file.name.replace(/\.[^.]+$/i, "") || "product";

    for (let shrink = 0; shrink < 12; shrink++) {
      for (let q = 0.92; q >= 0.38; q -= 0.04) {
        const blob = await encode(w, h, q);
        if (blob && blob.size <= maxBytes) {
          return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
        }
      }
      w = Math.max(280, Math.round(w * 0.82));
      h = Math.max(280, Math.round(h * 0.82));
    }

    throw new Error(
      "No se pudo reducir la imagen lo suficiente. Usa otra foto o configura BLOB_READ_WRITE_TOKEN en Vercel."
    );
  } finally {
    bitmap.close();
  }
}
