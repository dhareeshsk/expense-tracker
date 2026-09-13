import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { auth } from "@/auth";
import { getSiteSettings } from "@/lib/site-settings";
import { SessionProvider } from "@/components/session-provider";
import { ToastProvider } from "@/components/toast-provider";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Expense Tracker",
  description: "Track your income, expenses, and investments.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f6e5c",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [session, siteSettings] = await Promise.all([
    auth(),
    getSiteSettings(),
  ]);

  const sessionInfo = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      }
    : null;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-surface text-text">
        <SessionProvider>
          <ToastProvider>
            <SiteHeader siteName={siteSettings.siteName} session={sessionInfo} />
            <div className="flex-1">{children}</div>
            <SiteFooter
              siteName={siteSettings.siteName}
              footerText={siteSettings.footerText}
            />
          </ToastProvider>
        </SessionProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
