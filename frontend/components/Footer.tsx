"use client";

import Link from "next/link";
import { FaSquareThreads } from "react-icons/fa6";
import { format } from "date-fns";
import { Cookie } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const openCookieSettings = () => {
    window.dispatchEvent(new Event("open-cookie-banner"));
  };

  return (
    <footer className="bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 mt-auto transition-colors">
      <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-4 px-4">
        <p>
          Daten basierend auf Markus Lanz, Maybritt Illner, Caren Miosga,
          Maischberger, Hart aber fair (2024 - {currentYear})
        </p>
        <p>
          und der API von{" "}
          <Link
            href={"https://abgeordnetenwatch.de"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-black/70 dark:text-gray-300 hover:text-black/90 dark:hover:text-white hover:underline transition-colors"
          >
            Abgeordnetenwatch.de
          </Link>
          .
        </p>
        <div className="flex flex-col md:flex-row justify-center items-center gap-2 md:gap-4 mt-2">
          <p>Letztes Update: {format(new Date(), "dd.MM.yyyy")}</p>
          <div className="flex gap-4">
            <Link
              href="/datenschutz"
              className="text-black/70 dark:text-gray-300 hover:text-black/90 dark:hover:text-white hover:underline transition-colors"
            >
              Datenschutz
            </Link>
            <Link
              href="/impressum"
              className="text-black/70 dark:text-gray-300 hover:text-black/90 dark:hover:text-white hover:underline transition-colors"
            >
              Impressum
            </Link>
            <Link
              href="/api-docs"
              className="text-black/70 dark:text-gray-300 hover:text-black/90 dark:hover:text-white hover:underline transition-colors"
            >
              API
            </Link>
            <button
              onClick={openCookieSettings}
              className="flex items-center gap-1 text-black/70 dark:text-gray-300 hover:text-black/90 dark:hover:text-white hover:underline transition-colors"
            >
              <Cookie className="size-4" />
              Cookies
            </button>
            <Link
              href="https://www.threads.net/@polittalk.watcher"
              target="_blank"
              rel="noopener noreferrer"
              className="text-black/70 dark:text-gray-300 hover:text-black/90 dark:hover:text-white transition-colors"
            >
              <FaSquareThreads className="size-5" />
            </Link>
          </div>
        </div>
        {/* <div className="mt-3 flex gap-2.5 justify-center items-center">
          <p className="mb-2">Zur Unterstützung des Projekts:</p>
          <form
            action="https://www.paypal.com/donate"
            method="post"
            target="_top"
          >
            <input
              type="hidden"
              name="hosted_button_id"
              value="RRW3Q74H6EMCU"
            />
            <input
              type="image"
              src="https://www.paypalobjects.com/de_DE/DE/i/btn/btn_donate_LG.gif"
              name="submit"
              title="PayPal - The safer, easier way to pay online!"
              alt="Spenden mit dem PayPal-Button"
            />
            <Image
              alt=""
              src="https://www.paypal.com/de_DE/i/scr/pixel.gif"
              width="1"
              height="1"
            />
          </form>
        </div> */}
      </div>
    </footer>
  );
}
