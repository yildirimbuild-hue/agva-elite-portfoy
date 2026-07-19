import { AdminLogin } from "@/components/AdminLogin";
import { AdminPanel } from "@/components/AdminPanel";
import { getAppointments, getAppointmentSettings } from "@/lib/appointment-store";
import { isAdminAuthenticated } from "@/lib/auth";
import { getLeads } from "@/lib/lead-store";
import { getListings } from "@/lib/listing-store";
import { getAdminSiteSettings } from "@/lib/site-settings-store";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) return <AdminLogin />;
  const [listings, settings, leads, appointments, appointmentSettings] = await Promise.all([
    getListings({ includeDrafts: true }),
    getAdminSiteSettings(),
    getLeads().catch(() => []),
    getAppointments().catch(() => []),
    getAppointmentSettings().catch(() => null),
  ]);
  return <AdminPanel
    initialListings={listings}
    initialSettings={settings}
    initialLeads={leads}
    initialAppointments={appointments}
    initialAppointmentSettings={appointmentSettings}
  />;
}
