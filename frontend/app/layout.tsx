import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TV Politik Dashboard",
  description: "Markus Lanz Politiker-Statistiken mit interaktiven Charts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 min-h-full flex flex-col`}
      >
        <Navigation />
        <div className="mx-auto bg-red-100 rounded-2xl p-3 mt-2.5">
          <p>
            ⚠️ Diese Seite befindet sich noch im Aufbau und wird stetig
            erweitert. Gleich sind die Seiten wieder erreichbar. ⚠️
          </p>
        </div>
        <main className="flex-grow">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
