import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "PORTALU — Plataforma de Marketing & Ventas | Alucinando",
  description: "Plataforma SaaS de marketing, ventas e IA by Alucinando",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={cn("font-sans", dmSans.variable)}>
      <body>{children}</body>
    </html>
  );
}
