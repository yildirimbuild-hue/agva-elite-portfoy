import { NextResponse } from "next/server";
import { setAdminSession, verifyAdminPassword } from "@/lib/auth";

const attempts = new Map<string, { count: number; resetAt: number }>();

function clientId(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function isBlocked(request: Request) {
  const client = clientId(request);
  const now = Date.now();
  const current = attempts.get(client);
  if (!current || current.resetAt <= now) {
    attempts.set(client, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return false;
  }
  current.count += 1;
  return current.count > 10;
}

export async function POST(request: Request) {
  if (isBlocked(request)) {
    return NextResponse.json({ error: "Çok fazla giriş denemesi. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  if (!body?.password || !verifyAdminPassword(body.password)) {
    return NextResponse.json({ error: "Şifre hatalı." }, { status: 401 });
  }
  attempts.delete(clientId(request));
  await setAdminSession();
  return NextResponse.json({ ok: true });
}
