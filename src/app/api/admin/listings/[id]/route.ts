import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { deleteListing, updateListing } from "@/lib/listing-store";
import type { ListingInput } from "@/lib/types";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const { id } = await context.params;
  const updated = await updateListing(id, (await request.json()) as Partial<ListingInput>);
  if (!updated) return NextResponse.json({ error: "İlan bulunamadı." }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const { id } = await context.params;
  if (!(await deleteListing(id))) return NextResponse.json({ error: "İlan bulunamadı." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
