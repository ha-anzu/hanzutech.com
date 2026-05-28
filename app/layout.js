import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-plex-mono",
  display: "swap"
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-plex-sans",
  display: "swap"
});

export const metadata = {
  title: "Hanzu Tech | Technically Designed Systems",
  description:
    "Hanzu Tech builds technically designed systems: jewelry workflows, production-ready design, automation, and practical software tools.",
  metadataBase: new URL("https://hanzutech.com"),
  openGraph: {
    title: "Hanzu Tech | Technically Designed Systems",
    description: "Design, build, automate, and ship production-aware systems.",
    url: "https://hanzutech.com/",
    type: "website"
  },
  icons: {
    icon: ["/favicon.ico", { url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${plexMono.variable} ${plexSans.variable}`}>
      <body className="grid-shell overflow-x-hidden">{children}</body>
    </html>
  );
}
