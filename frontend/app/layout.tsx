import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "./components/Navigation";

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
    <html lang="de">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-50`}
      >
        <Navigation />
        <main>{children}</main>
        <footer className="bg-white border-t mt-16">
          <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="text-center text-gray-500 text-sm">
              <p>
                Daten basierend auf Markus Lanz Sendungen und abgeordnetenwatch.de
              </p>
              <p className="mt-2">
                Letztes Update: {new Date().toLocaleDateString("de-DE")}
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
