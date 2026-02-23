"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Switch } from "./ui/switch";
import { Cookie, Shield, BarChart3 } from "lucide-react";

export const CookieBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  const updateGtag = (status: "granted" | "denied") => {
    if (typeof (window as any).gtag === "function") {
      (window as any).gtag("consent", "update", {
        analytics_storage: status,
      });
    }
  };

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (consent === "granted") {
      // Consent bei Rückkehrbesuchern wiederherstellen
      updateGtag("granted");
    } else if (consent === null) {
      // Noch keine Entscheidung getroffen → Banner anzeigen
      setShowBanner(true);
    }
    // "denied" → Banner nicht erneut anzeigen, Entscheidung respektieren

    const handleOpen = () => {
      const saved = localStorage.getItem("cookie_consent");
      setAnalyticsEnabled(saved === "granted");
      setShowBanner(true);
    };
    window.addEventListener("open-cookie-banner", handleOpen);
    return () => window.removeEventListener("open-cookie-banner", handleOpen);
  }, []);

  const saveCookiePreferences = () => {
    if (analyticsEnabled) {
      localStorage.setItem("cookie_consent", "granted");
      updateGtag("granted");
    } else {
      localStorage.setItem("cookie_consent", "denied");
      updateGtag("denied");
    }
    setShowBanner(false);
  };

  const acceptAll = () => {
    setAnalyticsEnabled(true);
    localStorage.setItem("cookie_consent", "granted");
    updateGtag("granted");
    setShowBanner(false);
  };

  return (
    <Dialog open={showBanner} onOpenChange={setShowBanner}>
      <DialogContent className="w-full md:w-[400pxs]" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Cookie className="size-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-2xl text-center">
            Cookie-Einstellungen
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            Wir möchten Ihre Erfahrung auf unserer Website verbessern
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex gap-3 items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="flex gap-3 items-start flex-1">
              <div className="rounded-lg bg-blue-500/10 p-2 mt-0.5">
                <Shield className="size-4 text-blue-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">
                  Essentiell
                </h4>
                <p className="text-xs text-muted-foreground">
                  Notwendig für die Funktion der Website
                </p>
              </div>
            </div>
            <Switch checked={true} disabled={true} />
          </div>

          <div className="flex gap-3 items-center justify-between p-3 rounded-lg border">
            <div className="flex gap-3 items-start flex-1">
              <div className="rounded-lg bg-green-500/10 p-2 mt-0.5">
                <BarChart3 className="size-4 text-green-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">
                  Analyse
                </h4>
                <p className="text-xs text-muted-foreground">
                  Analytics zur Verbesserung der Website
                </p>
              </div>
            </div>
            <Switch 
              checked={analyticsEnabled} 
              onCheckedChange={setAnalyticsEnabled}
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={acceptAll} className="w-full">
            Alle akzeptieren
          </Button>
          <Button
            onClick={saveCookiePreferences}
            variant="outline"
            className="w-full"
          >
            Auswahl speichern
          </Button>
          <Button
            onClick={() => {
              localStorage.setItem("cookie_consent", "denied");
              updateGtag("denied");
              setShowBanner(false);
            }}
            variant="ghost"
            className="w-full text-muted-foreground"
          >
            Ablehnen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
