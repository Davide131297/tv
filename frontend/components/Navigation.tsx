"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { ChevronDown, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import TransparentLogo from "@/public/transparent_logo.png";

export default function Navigation() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  // Handle scroll effect
  React.useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 10);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen]);

  const navLinks = [
    { title: "Übersicht", href: "/uebersicht" },
    {
      title: "Parteien",
      href: "/parteien",
      dropdown: true,
      children: [
        {
          title: "Übersicht",
          href: "/parteien",
          description: "Interaktive Charts & Verteilungen",
        },
        {
          title: "Zeitverlauf",
          href: "/parteien-zeitverlauf",
          description: "Entwicklung der Auftritte",
        },
      ],
    },
    { title: "Themen", href: "/politische-themen" },
    {
      title: "Politiker",
      href: "/politiker",
      dropdown: true,
      children: [
        {
          title: "Datenbank",
          href: "/politiker",
          description: "Detaillierte Tabelle",
        },
        {
          title: "Rankings",
          href: "/politiker-rankings",
          description: "Wer ist am häufigsten zu Gast?",
        },
      ],
    },
    { title: "Sendungen", href: "/sendungen" },
    { title: "Datenbank", href: "/datenbank" },
  ];

  return (
    <>
      <header
        className={cn(
          "sticky top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
          scrolled || isOpen
            ? "bg-white/90 backdrop-blur-xl border-gray-200 shadow-sm"
            : "bg-white/80 backdrop-blur-md border-transparent",
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-3 group"
              onClick={() => setIsOpen(false)}
            >
              <div className="relative w-10 h-10 transition-transform duration-300 group-hover:scale-110">
                <Image
                  src={TransparentLogo}
                  alt="Polittalk-Watcher Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div className="flex flex-col transform transition-transform duration-300 group-hover:translate-x-1">
                <span className="font-bold text-xl text-gray-900 leading-none">
                  Polittalk
                </span>
                <span className="text-sm font-medium text-blue-600 leading-none">
                  Watcher
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav
              className="hidden lg:flex items-center gap-1"
              aria-label="Hauptnavigation"
            >
              {navLinks.map((link) => {
                if (link.dropdown) {
                  return (
                    <div key={link.title} className="relative group px-3 py-2">
                      <button
                        className={cn(
                          "flex items-center gap-1 text-sm font-medium transition-colors hover:text-blue-600 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-lg",
                          pathname.startsWith(link.href)
                            ? "text-blue-600"
                            : "text-gray-600",
                        )}
                        aria-expanded={false}
                        aria-haspopup="true"
                      >
                        {link.title}
                        <ChevronDown
                          className="w-4 h-4 transition-transform duration-200 group-hover:rotate-180 text-gray-400 group-hover:text-blue-600"
                          aria-hidden="true"
                        />
                      </button>

                      {/* Dropdown Menu */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top translate-y-2 group-hover:translate-y-0 w-80 z-50">
                        <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-2 overflow-hidden ring-1 ring-black/5">
                          {link.children?.map((child) => (
                            <Link
                              key={child.href + child.title}
                              href={child.href}
                              className={cn(
                                "block p-3 rounded-lg transition-all duration-200 group/item hover:bg-gray-50 bg-white",
                              )}
                            >
                              <div
                                className={cn(
                                  "font-medium mb-0.5",
                                  pathname === child.href
                                    ? "text-blue-700"
                                    : "text-gray-900 group-hover/item:text-blue-700",
                                )}
                              >
                                {child.title}
                              </div>
                              {child.description && (
                                <div className="text-xs text-gray-500 leading-snug group-hover/item:text-gray-600">
                                  {child.description}
                                </div>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <Link
                    key={link.title}
                    href={link.href}
                    aria-current={pathname === link.href ? "page" : undefined}
                    className={cn(
                      "px-3 py-2 text-sm font-medium transition-all duration-200 rounded-lg hover:bg-gray-50 hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                      pathname === link.href
                        ? "text-blue-600 bg-blue-50/50"
                        : "text-gray-600",
                    )}
                  >
                    {link.title}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label={isOpen ? "Menü schließen" : "Menü öffnen"}
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
            >
              {isOpen ? (
                <X className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Menu className="w-6 h-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <nav
        id="mobile-menu"
        aria-label="Mobile Navigation"
        className={cn(
          "fixed inset-0 z-40 bg-white lg:hidden transition-all duration-300 ease-in-out",
          isOpen
            ? "opacity-100 pointer-events-auto translate-y-0"
            : "opacity-0 pointer-events-none -translate-y-4",
        )}
        style={{ top: "64px" }}
      >
        <div className="h-full overflow-y-auto pb-20">
          <div className="p-4 space-y-1">
            {navLinks.map((link) => {
              if (link.dropdown) {
                return (
                  <div key={link.title} className="space-y-1 py-2">
                    <div className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {link.title}
                    </div>
                    {link.children?.map((child) => (
                      <Link
                        key={child.href + child.title}
                        href={child.href}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "block px-4 py-3 rounded-xl transition-colors mx-2",
                          pathname === child.href
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "text-gray-600 hover:bg-gray-50 text-base",
                        )}
                      >
                        {child.title}
                        <div className="text-xs text-gray-400 font-normal mt-0.5">
                          {child.description}
                        </div>
                      </Link>
                    ))}
                  </div>
                );
              }

              return (
                <Link
                  key={link.title}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "block px-6 py-4 text-lg font-medium transition-colors border-b border-gray-50 last:border-0",
                    pathname === link.href
                      ? "text-blue-600"
                      : "text-gray-900 hover:text-blue-600",
                  )}
                >
                  {link.title}
                </Link>
              );
            })}
          </div>

          <div className="mt-8 px-6 text-center">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} Polittalk-Watcher
            </p>
          </div>
        </div>
      </nav>
    </>
  );
}
