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
  title: "Polittalk-Watcher",
  description: "Statistiken mit interaktiven Charts",
  icons: {
    icon: [
      {
        url: "/32.ico",
        sizes: "32x32",
        type: "image/x-icon",
      },
      {
        url: "/128.ico",
        sizes: "128x128",
        type: "image/x-icon",
      },
      {
        url: "/256.ico",
        sizes: "256x256",
        type: "image/x-icon",
      },
    ],
    shortcut: "/32.ico",
    apple: {
      url: "/128.ico",
      sizes: "128x128",
      type: "image/x-icon",
    },
  },
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
        <main className="flex-grow">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
