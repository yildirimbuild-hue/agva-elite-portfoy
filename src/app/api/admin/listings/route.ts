import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { createListing, getListings } from "@/lib/listing-store";
import type { ListingInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  return NextResponse.json(await getListings({ includeDrafts: true }));
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const input = (await request.json()) as ListingInput;
  if (!input.title || !input.location || !input.propertyType || !input.purpose) {
    return NextResponse.json({ error: "Zorunlu alanlar eksik." }, { status: 400 });
  }
  return NextResponse.json(await createListing(input), { status: 201 });
}
