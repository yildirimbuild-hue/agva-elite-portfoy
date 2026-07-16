import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "İKİSU Private Estates | Ağva",
  description:
    "Ağva'nın nehir, orman ve kıyı hattındaki seçkin yaşam alanları için editoryal portföy deneyimi.",
  keywords: ["Ağva emlak", "Şile emlak", "lüks konut", "özel portföy", "Ağva villa"],
  openGraph: {
    title: "İKİSU Private Estates",
    description: "İki nehir arasında, seçkin yaşamların özel sunumu.",
    type: "website",
    locale: "tr_TR",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
