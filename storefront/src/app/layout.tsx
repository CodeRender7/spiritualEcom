import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DivineKart — Sacred Art & Hindu Spiritual Essentials",
  description: "Shop authentic Hindu religious photos, god image keyrings, spiritual idols, stickers, banners, photo frames, and spiritual attire.",
  keywords: "Hindu religious items, Ganesha idols, Ram Lalla stickers, Krishna photo frames, Puja items, Saffron flags, Spiritual clothing, Mandir decor",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
