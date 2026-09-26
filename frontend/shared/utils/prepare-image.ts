// @ts-nocheck
const browserInputLimit = 12 * 1024 * 1024;
const portableUploadTarget = 600 * 1024;

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

export async function prepareImageForUpload(file: File) {
  if (!file.size || file.size > browserInputLimit) throw new Error("IMAGE_TOO_LARGE");
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error("INVALID_IMAGE_TYPE");
  if (file.size <= portableUploadTarget) return file;

  const bitmap = await createImageBitmap(file);
  try {
    let scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    let best: Blob | null = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("IMAGE_PROCESSING_UNAVAILABLE");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const candidate = await canvasBlob(canvas, Math.max(0.58, 0.86 - attempt * 0.05));
      if (!candidate) throw new Error("IMAGE_PROCESSING_UNAVAILABLE");
      best = candidate;
      if (candidate.size <= portableUploadTarget) break;
      scale *= 0.8;
    }
    if (!best || best.size > 4 * 1024 * 1024) throw new Error("IMAGE_COULD_NOT_BE_OPTIMIZED");
    return new File([best], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } finally {
    bitmap.close();
  }
}
