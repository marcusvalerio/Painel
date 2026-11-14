import type { Metadata, Viewport } from "next";
import { Gabarito, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const gabarito = Gabarito({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-gabarito" });
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Pauta",
  description: "Gestão de demandas, aprovação e agendamento para agências.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A1AFF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${gabarito.variable} ${geist.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
