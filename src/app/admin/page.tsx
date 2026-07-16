import { AdminLogin } from "@/components/AdminLogin";
import { AdminPanel } from "@/components/AdminPanel";
import { isAdminAuthenticated } from "@/lib/auth";
import { getListings } from "@/lib/listing-store";
import { getAdminSiteSettings } from "@/lib/site-settings-store";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) return <AdminLogin />;
  const [listings, settings] = await Promise.all([getListings({ includeDrafts: true }), getAdminSiteSettings()]);
  return <AdminPanel initialListings={listings} initialSettings={settings} />;
}
