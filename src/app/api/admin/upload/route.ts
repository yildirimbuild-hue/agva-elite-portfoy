import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";

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
  const target = path.join(process.cwd(), "public", "uploads", name);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ url: `/uploads/${name}` });
}
