import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t mt-auto">
      <div className="text-center text-gray-500 text-sm py-4 px-4">
        <p>
          Daten basierend auf Markus Lanz, Maybritt Illner, Caren Miosga,
          Maischberger, Hart aber fair und Phoenix Runde Sendungen (2024 -{" "}
          {currentYear})
        </p>
        <p>
          und der API von{" "}
          <Link
            href={"https://abgeordnetenwatch.de"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-black/70 hover:text-black/90 hover:underline"
          >
            Abgeordnetenwatch.de
          </Link>
          .
        </p>
        <div className="flex justify-center gap-4 mt-2">
          <p>Letztes Update: {new Date().toLocaleDateString("de-DE")}</p>
          <Link
            href="/datenschutz"
            className="text-black/70 hover:text-black/90 hover:underline"
          >
            Datenschutz
          </Link>
          <Link
            href="/impressum"
            className="text-black/70 hover:text-black/90 hover:underline"
          >
            Impressum
          </Link>
        </div>
        <div className="mt-3 flex gap-2.5 justify-center items-center">
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
        </div>
      </div>
    </footer>
  );
}
