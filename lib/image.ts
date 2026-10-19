// Shrinks a phone photo (often 4-8 MB) to a web-sized JPEG before upload, so the dashboard stays fast.
export async function shrinkImage(file: File, maxSide = 1200, quality = 0.86): Promise<Blob> {
  const bitmap = await createImageBitmap(file); // honours the photo's rotation
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process that image."))), "image/jpeg", quality),
  );
}

// The crop is kept as "x,y" percentages: which part of the photo stays in view inside the frame.
export function parseFocus(v: string | undefined): [number, number] {
  const parts = (v ?? "").split(",");
  const num = (t: string | undefined) => (t && t.trim() !== "" ? Number(t) : NaN);
  const ok = (n: number) => Number.isFinite(n) && n >= 0 && n <= 100;
  const [x, y] = [num(parts[0]), num(parts[1])];
  return [ok(x) ? x : 50, ok(y) ? y : 30];
}
