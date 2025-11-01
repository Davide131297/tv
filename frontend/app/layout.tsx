import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ChatBot from "@/components/ChatBot";
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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://polittalk-watcher.de"
  ),
  title: {
    default: "Polittalk-Watcher – Politische Talkshows im Faktencheck",
    template: "%s | Polittalk-Watcher",
  },
  description:
    "Interaktive Statistiken und detaillierten Analysen von Markus Lanz, Maybrit Illner, Caren Miosga, Maischberger und Phoenix Runde",
  keywords: [
    "Politik",
    "Talkshows",
    "Statistiken",
    "Analyse",
    "ARD",
    "ZDF",
    "Polittalk",
    "Redezeiten",
    "Charts",
    "Datenanalyse",
    "CDU",
    "CSU",
    "SPD",
    "Gruene",
    "Die Linke",
    "FDP",
    "Lanz",
    "Maischberger",
    "Illner",
    "Misoga",
    "Hart aber fair",
    "Phoenix Runde",
  ],
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
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title:
      "Polittalk-Watcher – Interaktive Statistiken über Parteien- und Politikerauftritten von Markus Lanz, Maybrit Illner, Caren Miosga, Maischberger und Phoenix Runde",
    description:
      "Statistiken, Themenanalysen zu Deutschlands bekanntesten Polit-Talkshows. Datenbasiert, transparent und interaktiv.",
    url: "https://polittalk-watcher.de",
    siteName: "Polittalk-Watcher",
    locale: "de_DE",
    type: "website",
    images: [
      {
        url: "/transparent_logo.png",
        width: 1200,
        height: 630,
        alt: "Polittalk-Watcher Vorschau",
      },
    ],
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
        <ChatBot />
        <Analytics />
      </body>
    </html>
  );
}
