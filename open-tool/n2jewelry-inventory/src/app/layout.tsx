import "./globals.css";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { cookies } from "next/headers";
import { cn } from "@/lib/utils";
import { AppTopNav } from "@/components/app-top-nav";
import { ThemeProvider } from "@/components/theme-provider";
import { APP_ROLE_COOKIE, parseRole } from "@/lib/roles";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "N2Jewelry Inventory",
  description: "Manufacturing and inventory operating system for N2Jewelry"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const roleCookie = cookieStore.get(APP_ROLE_COOKIE)?.value;
  const initialRole = parseRole(roleCookie);

  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen">
        <ThemeProvider>
          <AppTopNav initialRole={initialRole} />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
