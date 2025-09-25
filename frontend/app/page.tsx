import EnhancedPoliticsStats from "./components/EnhancedPoliticsStats";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                📺 TV Politik Dashboard
              </h1>
            </div>
            <div className="text-sm text-gray-500 hidden sm:block">
              Markus Lanz Politiker-Statistiken mit interaktiven Charts
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        <EnhancedPoliticsStats />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500 text-sm">
            <p>
              Daten basierend auf Markus Lanz Sendungen und abgeordnetenwatch.de
            </p>
            <p className="mt-2">
              Letztes Update: {new Date().toLocaleDateString("de-DE")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
