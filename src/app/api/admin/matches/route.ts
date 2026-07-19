import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getLeads } from "@/lib/lead-store";
import { getListings } from "@/lib/listing-store";
import { rankCustomersForListing, rankListingsForCustomer } from "@/lib/matching-engine";
import { recordError } from "@/lib/error-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const url = new URL(request.url);
  const leadId = url.searchParams.get("leadId")?.trim();
  const listingReference = url.searchParams.get("listingReference")?.trim();
  if ((!leadId && !listingReference) || (leadId && listingReference)) {
    return NextResponse.json({ error: "Yalnız müşteri veya portföy belirtin." }, { status: 400 });
  }
  try {
    if (leadId) {
      const [leads, listings] = await Promise.all([getLeads(), getListings()]);
      const lead = leads.find((item) => item.id === leadId);
      if (!lead) return NextResponse.json({ error: "Müşteri bulunamadı." }, { status: 404 });
      return NextResponse.json({
        direction: "customer_to_listings",
        lead: { id: lead.id, name: lead.name, customerRole: lead.customerRole, stage: lead.stage },
        matches: rankListingsForCustomer(lead, listings),
      });
    }
    const [leads, listings] = await Promise.all([getLeads(), getListings({ includeDrafts: true })]);
    const listing = listings.find((item) => item.reference === listingReference);
    if (!listing) return NextResponse.json({ error: "Portföy bulunamadı." }, { status: 404 });
    return NextResponse.json({
      direction: "listing_to_customers",
      listing: { reference: listing.reference, title: listing.title, purpose: listing.purpose, propertyType: listing.propertyType, location: listing.location },
      matches: rankCustomersForListing(listing, leads),
    });
  } catch (error) {
    await recordError("admin.matches.list", error);
    return NextResponse.json({ error: "Eşleştirmeler hesaplanamadı." }, { status: 503 });
  }
}
