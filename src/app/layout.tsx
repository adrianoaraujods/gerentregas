import "@/styles/globals.css";

import type { Metadata } from "next";
import { Figtree, JetBrains_Mono, Montserrat } from "next/font/google";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { cn } from "@/lib/utils";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-sans" });

const baseFontFamily = Figtree({
  variable: "--font-base",
  subsets: ["latin"],
});

const jetbrainsMonoHeading = JetBrains_Mono({
  variable: "--font-heading",
  subsets: ["latin"],
});

const monoFontFamily = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gerentregas",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Gerentregas",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={cn(
        baseFontFamily.variable,
        monoFontFamily.variable,
        "font-sans",
        montserrat.variable,
        jetbrainsMonoHeading.variable,
      )}
      suppressHydrationWarning // because of `next-themes`
    >
      <body className="min-h-svh flex flex-col text-foreground bg-background">
        <Providers>{children}</Providers>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
