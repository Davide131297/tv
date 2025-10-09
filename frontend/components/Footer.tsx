export default function Footer() {
  return (
    <footer className="bg-white border-t mt-auto">
      <div className="text-center text-gray-500 text-sm py-4 px-4">
        <p>
          Daten basierend auf Markus Lanz, Maybritt Illner, Caren Miosga,
          Maischberger & Hart aber fair Sendungen und abgeordnetenwatch.de
        </p>
        <p className="mt-2">
          Letztes Update: {new Date().toLocaleDateString("de-DE")}
        </p>
      </div>
    </footer>
  );
}
