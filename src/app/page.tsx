import PortfolioApp from "@/components/PortfolioApp";
import { getListings } from "@/lib/listing-store";

export const dynamic = "force-dynamic";

export default async function Home() {
  return <PortfolioApp listings={await getListings()} />;
}
