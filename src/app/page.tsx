import Experience from "@/components/Experience";
import listings from "@/data/listings.json";

export default function Home() {
  return <Experience listings={listings} />;
}
