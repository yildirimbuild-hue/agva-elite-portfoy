import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getAdminSiteSettings, updateSiteSettings, type SiteSettingsUpdate } from "@/lib/site-settings-store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  return NextResponse.json(await getAdminSiteSettings(), { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as SiteSettingsUpdate | null;
  if (!body) return NextResponse.json({ error: "Geçerli ayar verisi gönderin." }, { status: 400 });
  try {
    return NextResponse.json(await updateSiteSettings(body));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ayarlar kaydedilemedi." }, { status: 400 });
  }
}
