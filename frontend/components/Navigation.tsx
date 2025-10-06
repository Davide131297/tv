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
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
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
  {
    title: "Datenbank",
    href: "/database",
    description: "Alle Datenbank-Einträge mit Feedback-Option",
  },
];

export default function Navigation() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const { user, loading, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

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

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="w-8 h-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:inline">{user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Mein Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/account" className="cursor-pointer">
                      Account-Einstellungen
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    Abmelden
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth/login">
                <Button size="sm">Anmelden / Registrieren</Button>
              </Link>
            )}

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
                  {user && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut}>
                        Abmelden
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
