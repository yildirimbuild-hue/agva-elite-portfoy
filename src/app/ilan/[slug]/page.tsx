import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingDetail } from "@/components/ListingDetail";
import { getCompanyProfile } from "@/lib/company-store";
import { getListingBySlug } from "@/lib/listing-store";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const listing = await getListingBySlug((await params).slug);
  if (!listing) return { title: "İlan bulunamadı | İKİSU Emlak" };
  return {
    title: listing.seoTitle || `${listing.title} | İKİSU Emlak`,
    description: listing.metaDescription || `${listing.location} bölgesinde ${listing.purpose.toLocaleLowerCase("tr-TR")} ${listing.propertyType.toLocaleLowerCase("tr-TR")} · ${listing.reference}`,
    keywords: listing.keywords,
    openGraph: {
      title: listing.seoTitle || listing.title,
      description: listing.metaDescription,
      type: "article",
      images: listing.images[0] ? [{ url: listing.images[0] }] : undefined,
    },
  };
}

export default async function ListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const [listing, company] = await Promise.all([
    getListingBySlug((await params).slug),
    getCompanyProfile(),
  ]);
  if (!listing) notFound();
  return <ListingDetail listing={listing} company={company} />;
}
