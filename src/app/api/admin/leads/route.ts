import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { deleteLead, getLeads } from "@/lib/lead-store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  try {
    return NextResponse.json(await getLeads());
  } catch (error) {
    console.error("Lead list failed", error);
    return NextResponse.json({ error: "Talepler okunamadı. Dağıtım ayarlarını kontrol edin." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Silinecek talep belirtilmedi." }, { status: 400 });
  try {
    const removed = await deleteLead(id);
    if (!removed) return NextResponse.json({ error: "Talep bulunamadı." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Lead delete failed", error);
    return NextResponse.json({ error: "Talep silinemedi. Dağıtım ayarlarını kontrol edin." }, { status: 503 });
  }
}
