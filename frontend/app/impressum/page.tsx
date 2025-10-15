export default function Page() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Impressum</h1>

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-2">Angaben gemäß § 5 TMG</h2>
          <p>
            Davide Chiffi
            <br />
            Kalk-Mülheimer Str. 177
            <br />
            51103 Köln
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Kontakt</h2>
          <p>E-Mail: [E-Mail-Adresse]</p>
        </section>
      </div>
    </div>
  );
}
