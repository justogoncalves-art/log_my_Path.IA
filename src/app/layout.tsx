import type { Metadata } from "next";
import localFont from "next/font/local";
import { DM_Mono, Syncopate } from "next/font/google";
import { getLang } from "@/lib/i18n";
import "./globals.css";

const spaceGrotesk = localFont({
  src: "../fonts/SpaceGrotesk-VariableFont_wght.ttf",
  variable: "--font-space-grotesk",
  display: "swap",
});
const quicksand = localFont({
  src: "../fonts/Quicksand-VariableFont_wght.ttf",
  variable: "--font-quicksand",
  display: "swap",
});
const syncopate = Syncopate({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-syncopate" });
const dmMono = DM_Mono({ weight: ["400", "500"], subsets: ["latin"], variable: "--font-dm-mono" });

export const metadata: Metadata = {
  title: "MY PATH.IA",
  description: "Ecosistema psicopedagógico · Build your tomorrow.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html
      lang={lang}
      className={`${spaceGrotesk.variable} ${quicksand.variable} ${syncopate.variable} ${dmMono.variable}`}
    >
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
