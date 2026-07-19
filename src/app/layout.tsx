import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "İKİSU Emlak | Ağva Satılık ve Kiralık Portföy",
  description:
    "Ağva ve Şile bölgesinde satılık ve kiralık villa, müstakil ev, daire, arsa ve ticari portföyler.",
  keywords: ["Ağva emlak", "Şile emlak", "lüks konut", "özel portföy", "Ağva villa"],
  openGraph: {
    title: "İKİSU Emlak",
    description: "Ağva'nın güncel satılık ve kiralık emlak portföyü.",
    type: "website",
    locale: "tr_TR",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
