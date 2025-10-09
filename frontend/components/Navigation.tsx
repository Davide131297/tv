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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    title: "Politische Themen",
    href: "/politische-themen",
    description: "Verteilung der politischen Themenbereiche",
  },
  {
    title: "Politiker",
    href: "/politiker",
    description: "Detaillierte Politiker-Tabelle",
  },
  {
    title: "Politiker-Rankings",
    href: "/politiker-rankings",
    description: "Ranking der häufigsten Talkshow-Gäste",
  },
  {
    title: "Sendungen",
    href: "/sendungen",
    description: "Übersicht der letzten Sendungen",
  },
  {
    title: "Datenbank",
    href: "/datenbank",
    description: "Alle Datenbank-Einträge mit Feedback-Option",
  },
];

export default function Navigation() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);

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
            <DropdownMenu onOpenChange={setIsOpen}>
              <DropdownMenuTrigger className="p-2 rounded-md hover:bg-gray-100 transition-colors">
                <div className="w-6 h-6 flex flex-col justify-center items-center">
                  <span
                    className={cn(
                      "block h-0.5 w-6 bg-gray-600 transition-all duration-300 ease-in-out",
                      isOpen ? "rotate-45 translate-y-1" : "-translate-y-1"
                    )}
                  />
                  <span
                    className={cn(
                      "block h-0.5 w-6 bg-gray-600 transition-all duration-300 ease-in-out",
                      isOpen ? "opacity-0" : "opacity-100"
                    )}
                  />
                  <span
                    className={cn(
                      "block h-0.5 w-6 bg-gray-600 transition-all duration-300 ease-in-out",
                      isOpen ? "-rotate-45 -translate-y-1" : "translate-y-1"
                    )}
                  />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Navigation</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {navigationItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "w-full cursor-pointer",
                        pathname === item.href &&
                          "bg-accent text-accent-foreground"
                      )}
                    >
                      {item.title}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Info - moved to be responsive */}
          <div className="text-sm text-gray-500 hidden xl:block">
            Politiker-Statistiken in TV Sendungen
          </div>
        </div>
      </div>
    </header>
  );
}

const ListItem = React.forwardRef<
  React.ComponentRef<"a">,
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
