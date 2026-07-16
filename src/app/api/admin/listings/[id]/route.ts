import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { deleteListing, getListings, updateListing } from "@/lib/listing-store";
import type { ListingInput } from "@/lib/types";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const { id } = await context.params;
  const input = (await request.json()) as Partial<ListingInput>;
  const existing = (await getListings({ includeDrafts: true })).find((item) => item.id === id);
  if (!existing) return NextResponse.json({ error: "İlan bulunamadı." }, { status: 404 });
  const nextPrice = input.price ?? existing.price;
  const nextOldPrice = input.oldPrice ?? existing.oldPrice;
  const nextPublished = input.published ?? existing.published;
  const nextImages = input.images ?? existing.images;
  if (nextOldPrice > 0 && nextOldPrice <= nextPrice) {
    return NextResponse.json({ error: "Eski fiyat yeni fiyattan yüksek olmalıdır." }, { status: 400 });
  }
  if (nextPublished && nextImages.length === 0) {
    return NextResponse.json({ error: "İlanı yayında tutmak için en az bir görsel ekleyin." }, { status: 400 });
  }
  let updated: Awaited<ReturnType<typeof updateListing>>;
  try {
    updated = await updateListing(id, input);
  } catch (error) {
    console.error("Listing update failed", error);
    return NextResponse.json({ error: "Portföy veri deposuna yazılamadı. Dağıtım ayarlarını kontrol edin." }, { status: 503 });
  }
  if (!updated) return NextResponse.json({ error: "İlan bulunamadı." }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const { id } = await context.params;
  try {
    if (!(await deleteListing(id))) return NextResponse.json({ error: "İlan bulunamadı." }, { status: 404 });
  } catch (error) {
    console.error("Listing delete failed", error);
    return NextResponse.json({ error: "Portföy veri deposuna yazılamadı. Dağıtım ayarlarını kontrol edin." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
