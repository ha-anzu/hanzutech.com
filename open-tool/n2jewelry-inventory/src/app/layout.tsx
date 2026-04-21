import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "N2Jewelry Inventory",
  description: "Manufacturing and inventory operating system for N2Jewelry"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
