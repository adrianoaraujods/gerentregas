import "@/styles/globals.css";

import type { Metadata } from "next";
import { Contrail_One, Fira_Code, Fira_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";

const baseFontFamily = Fira_Sans({
  variable: "--font-base",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const headingFontFamily = Contrail_One({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: "400",
});

const monoFontFamily = Fira_Code({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gerentregas",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${baseFontFamily.variable} ${headingFontFamily.variable} ${monoFontFamily.variable}`}
      suppressHydrationWarning // because of `next-themes`
    >
      <body className="min-h-svh flex flex-col text-foreground bg-background">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
