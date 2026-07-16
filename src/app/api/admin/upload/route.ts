import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";

const allowedTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Görsel bulunamadı." }, { status: 400 });
  const extension = allowedTypes.get(file.type);
  if (!extension || file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Yalnız JPG, PNG veya WebP; en fazla 8 MB." }, { status: 400 });
  }
  const name = `${randomUUID()}${extension}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(`portfolio/${name}`, file, {
        access: "public",
        addRandomSuffix: false,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      return NextResponse.json({ url: blob.url });
    } catch (error) {
      console.error("Vercel Blob upload failed", error);
      return NextResponse.json({ error: "Görsel kalıcı depoya yüklenemedi." }, { status: 502 });
    }
  }

  if (process.env.VERCEL) {
    return NextResponse.json(
      { error: "Kalıcı görsel depolama yapılandırılmadı. Vercel Blob mağazasını bağlayın." },
      { status: 503 },
    );
  }

  const target = path.join(process.cwd(), "public", "uploads", name);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ url: `/uploads/${name}` });
}
