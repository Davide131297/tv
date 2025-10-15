import Link from "next/link";

export default function DatenschutzPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Datenschutzerklärung</h1>

      <div className="prose prose-gray max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            1. Datenschutz auf einen Blick
          </h2>

          <h3 className="text-xl font-medium mb-3">Allgemeine Hinweise</h3>
          <h3 className="text-xl font-medium mb-3">
            Hinweis zur verantwortlichen Stelle
          </h3>
          <p className="mb-4">
            Die verantwortliche Stelle für die Datenverarbeitung auf dieser
            Website ist:
          </p>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p className="font-medium">Davide Chiffi</p>
            <p>Kalk-Mülheimer Straße 177</p>
            <p>51103 Köln</p>
            <p>Deutschland</p>
            <br />
            <p>
              Email:{" "}
              <a
                href="mailto:kontakt@polittalk-watcher.de"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                kontakt@polittalk-watcher.de
              </a>
            </p>
          </div>
          <p className="mb-4">
            Die folgenden Hinweise geben einen einfachen Überblick darüber, was
            mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website
            besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie
            persönlich identifiziert werden können.
          </p>

          <h3 className="text-xl font-medium mb-3">
            Datenerfassung auf dieser Website
          </h3>
          <p className="mb-4">
            Diese Website erfasst keine personenbezogenen Daten. Es werden keine
            Cookies gesetzt, keine Formulare zur Verfügung gestellt und keine
            Benutzerkonten angelegt. Die Website dient ausschließlich der
            Information über politische Talkshow-Auftritte.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Hosting</h2>
          <p className="mb-4">
            Diese Website wird bei Vercel gehostet. Der Anbieter erhebt in sog.
            Logfiles automatisch Informationen, die Ihr Browser automatisch an
            uns übermittelt. Dies sind:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Browsertyp und Browserversion</li>
            <li>Verwendetes Betriebssystem</li>
            <li>Referrer URL</li>
            <li>Hostname des zugreifenden Rechners</li>
            <li>Uhrzeit der Serveranfrage</li>
            <li>IP-Adresse</li>
          </ul>
          <p className="mb-4">
            Diese Daten werden nicht mit anderen Datenquellen zusammengeführt.
            Die Erfassung dieser Daten erfolgt auf Grundlage von Art. 6 Abs. 1
            lit. f DSGVO. Der Websitebetreiber hat ein berechtigtes Interesse an
            der technisch fehlerfreien Darstellung und der Optimierung seiner
            Website.
          </p>
          <p>
            Dienstanbieter: Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA
            91789, USA; Website:{" "}
            <Link
              className="text-blue-500 underline hover:text-blue-700"
              href="https://vercel.com"
            >
              https://vercel.com
            </Link>
            . Datenschutzerklärung:
            <Link
              className="text-blue-500 underline hover:text-blue-700"
              href="https://vercel.com/legal/privacy-policy"
            >
              https://vercel.com/legal/privacy-policy
            </Link>
            .
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            3. Allgemeine Hinweise und Pflichtinformationen
          </h2>

          <h3 className="text-xl font-medium mb-3">Datenschutz</h3>
          <p className="mb-4">
            Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen
            Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten
            vertraulich und entsprechend den gesetzlichen
            Datenschutzvorschriften sowie dieser Datenschutzerklärung.
          </p>

          <h3 className="text-xl font-medium mb-3">Speicherdauer</h3>
          <p className="mb-4">
            Da diese Website keine personenbezogenen Daten erfasst oder
            speichert, entstehen keine Speicherfristen für Nutzerdaten.
            Lediglich die technischen Logfiles des Hosting-Anbieters werden
            entsprechend dessen Datenschutzrichtlinien verwaltet.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Ihre Rechte</h2>
          <p className="mb-4">
            Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft,
            Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu
            erhalten. Da diese Website jedoch keine personenbezogenen Daten
            erfasst, gibt es in der Regel keine zu Ihrer Person gespeicherten
            Daten.
          </p>
          <p className="mb-4">
            Sie haben außerdem ein Recht auf Berichtigung oder Löschung dieser
            Daten. Wenn Sie Fragen zum Datenschutz haben, können Sie sich
            jederzeit an uns wenden.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Datenquellen</h2>
          <p className="mb-4">
            Die auf dieser Website dargestellten Informationen über politische
            Talkshow-Auftritte stammen aus öffentlich zugänglichen Quellen und
            wurden automatisiert erfasst. Es handelt sich dabei um öffentliche
            Informationen über Politiker und deren Auftritte in
            öffentlich-rechtlichen Sendungen.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            6. Änderungen der Datenschutzerklärung
          </h2>
          <p className="mb-4">
            Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit
            sie stets den aktuellen rechtlichen Anforderungen entspricht oder um
            Änderungen unserer Leistungen in der Datenschutzerklärung
            umzusetzen.
          </p>
        </section>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Stand: {new Date().toLocaleDateString("de-DE")}
          </p>
        </div>
      </div>
    </div>
  );
}
