export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

export function detectImageType(bytes) {
  const matches = (offset, signature) => signature.every((value, i) => bytes[offset + i] === value);
  const text = (offset, value) => matches(offset, [...value].map((char) => char.charCodeAt(0)));
  if (matches(0, [137, 80, 78, 71, 13, 10, 26, 10])) return "image/png";
  if (matches(0, [255, 216, 255])) return "image/jpeg";
  if (text(0, "RIFF") && text(8, "WEBP")) return "image/webp";
  if (text(4, "ftyp")) {
    const headerEnd = Math.min(bytes.length, 64);
    for (let offset = 8; offset + 4 <= headerEnd; offset += 4) {
      if (text(offset, "avif") || text(offset, "avis")) return "image/avif";
    }
  }
  return null;
}

export async function validateImageFile(file) {
  if (!file || file.size === 0 || file.size > MAX_IMAGE_BYTES || !IMAGE_TYPES[file.type]) {
    throw new Error("Choose a JPEG, PNG, WebP, or AVIF image up to 5 MiB.");
  }
  const bytes = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  if (detectImageType(bytes) !== file.type) throw new Error("The file content does not match its image type.");
  // Decode before upload, including images with valid-looking but corrupt headers.
  const bitmap = await createImageBitmap(file);
  const valid = bitmap.width > 0 && bitmap.height > 0 && bitmap.width <= 12000 && bitmap.height <= 12000;
  bitmap.close();
  if (!valid) throw new Error("Choose an image no larger than 12,000 pixels per side.");
  return IMAGE_TYPES[file.type];
}
