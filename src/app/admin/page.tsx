import { AdminLogin } from "@/components/AdminLogin";
import { AdminPanel } from "@/components/AdminPanel";
import { isAdminAuthenticated } from "@/lib/auth";
import { getListings } from "@/lib/listing-store";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) return <AdminLogin />;
  return <AdminPanel initialListings={await getListings({ includeDrafts: true })} />;
}
