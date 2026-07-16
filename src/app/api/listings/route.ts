import { NextResponse } from "next/server";
import { getListings } from "@/lib/listing-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getListings());
}
