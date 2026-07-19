import PortfolioApp from "@/components/PortfolioApp";
import { getCompanyProfile } from "@/lib/company-store";
import { getListings } from "@/lib/listing-store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [listings, company] = await Promise.all([getListings(), getCompanyProfile()]);
  return <PortfolioApp listings={listings} company={company} />;
}
