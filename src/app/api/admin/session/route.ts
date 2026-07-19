import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { authenticated: await isAdminAuthenticated() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
