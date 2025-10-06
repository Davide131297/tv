export default function AuthLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="mt-4 text-lg font-medium text-gray-900">Lädt...</h2>
          <p className="mt-2 text-sm text-gray-600">Überprüfe Anmeldestatus</p>
        </div>
      </div>
    </div>
  );
}
