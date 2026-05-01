// Lightweight client-side image processing for ID-style portrait photos.
// No external deps — pure Canvas. Targets ~512×512 JPEG.

export type ProcessOptions = {
  size?: number;          // output square size (px)
  quality?: number;       // jpeg quality 0..1
  brightness?: number;    // 1 = none
  contrast?: number;      // 1 = none
};

/**
 * Read a File into a data URL.
 */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Auto-enhance + square crop centered on the upper-middle (face zone for portraits).
 * Returns a JPEG data URL.
 */
export async function processPortrait(src: string, opts: ProcessOptions = {}): Promise<string> {
  const size = opts.size ?? 512;
  const quality = opts.quality ?? 0.88;
  const brightness = opts.brightness ?? 1.05;
  const contrast = opts.contrast ?? 1.1;

  const img = await loadImage(src);
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  // Square crop: take the largest square, centered horizontally, biased UP (face is usually upper portion).
  const side = Math.min(w, h);
  const sx = Math.max(0, (w - side) / 2);
  // Bias vertical crop ~20% upward so the face/head is prominently framed.
  const sy = Math.max(0, (h - side) / 2 - side * 0.2);
  const sySafe = Math.min(sy, h - side);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  // Apply auto-enhance via filter
  (ctx as any).filter = `brightness(${brightness}) contrast(${contrast}) saturate(1.05)`;
  ctx.drawImage(img, sx, sySafe, side, side, 0, 0, size, size);
  (ctx as any).filter = "none";

  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Compress an arbitrary image (e.g. ID card photo) keeping aspect ratio,
 * max dimension `maxSide`. Returns a JPEG data URL.
 */
export async function compressImage(src: string, maxSide = 1280, quality = 0.85): Promise<string> {
  const img = await loadImage(src);
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  const ratio = Math.min(1, maxSide / Math.max(w, h));
  w = Math.round(w * ratio);
  h = Math.round(h * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  (ctx as any).filter = "brightness(1.04) contrast(1.08)";
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}
