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
  if (nextOldPrice > 0 && nextOldPrice <= nextPrice) {
    return NextResponse.json({ error: "Eski fiyat yeni fiyattan yüksek olmalıdır." }, { status: 400 });
  }
  const updated = await updateListing(id, input);
  if (!updated) return NextResponse.json({ error: "İlan bulunamadı." }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const { id } = await context.params;
  if (!(await deleteListing(id))) return NextResponse.json({ error: "İlan bulunamadı." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
