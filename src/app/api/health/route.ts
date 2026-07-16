import { NextResponse } from "next/server";
import { getDeploymentChecks } from "@/lib/deployment";
import { getListingStorageMode, getListings } from "@/lib/listing-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = getDeploymentChecks();
  let catalogReadable = false;
  let publishedListings = 0;

  try {
    const listings = await getListings();
    catalogReadable = true;
    publishedListings = listings.length;
  } catch (error) {
    console.error("Health check catalog read failed", error);
  }

  const requiredReady = checks.every((check) => check.configured);
  const ready = catalogReadable && requiredReady;
  return NextResponse.json(
    {
      status: ready ? "ready" : "configuration_required",
      environment: process.env.VERCEL_ENV ?? "local",
      catalog: { readable: catalogReadable, publishedListings, storage: getListingStorageMode() },
      services: Object.fromEntries(checks.map((check) => [check.key, check.configured])),
    },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
