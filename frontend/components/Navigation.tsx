"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

const navigationItems = [
  {
    title: "Übersicht",
    href: "/uebersicht",
    description: "Gesamtübersicht der Politiker-Statistiken",
  },
  {
    title: "Parteien",
    href: "/parteien",
    description: "Partei-Chart und Verteilung",
  },
  {
    title: "Politiker",
    href: "/politiker",
    description: "Detaillierte Politiker-Tabelle",
  },
  {
    title: "Sendungen",
    href: "/sendungen",
    description: "Übersicht der letzten Sendungen",
  },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link
              href="/"
              className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
            >
              📺 TV Politik Dashboard
            </Link>
          </div>

          {/* Navigation Menu */}
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Ansichten</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                    {navigationItems.map((item) => (
                      <ListItem
                        key={item.title}
                        title={item.title}
                        href={item.href}
                        isActive={pathname === item.href}
                      >
                        {item.description}
                      </ListItem>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <select
              value={pathname}
              onChange={(e) => (window.location.href = e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="/">Start</option>
              {navigationItems.map((item) => (
                <option key={item.href} value={item.href}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>

          {/* Info */}
          <div className="text-sm text-gray-500 hidden lg:block">
            Markus Lanz Politiker-Statistiken
          </div>
        </div>
      </div>
    </header>
  );
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & {
    isActive?: boolean;
    title: string;
    children: React.ReactNode;
    href: string;
  }
>(({ className, title, children, isActive, href, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          ref={ref}
          href={href}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            isActive && "bg-accent text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";
