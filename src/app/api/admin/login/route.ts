import { NextResponse } from "next/server";
import { setAdminSession, verifyAdminPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  if (!body?.password || !verifyAdminPassword(body.password)) {
    return NextResponse.json({ error: "Şifre hatalı." }, { status: 401 });
  }
  await setAdminSession();
  return NextResponse.json({ ok: true });
}
