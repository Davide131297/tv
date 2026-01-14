import type { PoliticalAreaStats } from "@/types";

export default function PoliticalAreasTable({
  politicalAreaStats,
}: {
  politicalAreaStats: PoliticalAreaStats[];
}) {
  return politicalAreaStats.length > 0 ? (
    <div
      className="mt-8 bg-white rounded-lg shadow-md overflow-hidden"
      id="aufschluesselung"
    >
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
          Detaillierte Aufschlüsselung
        </h2>
      </div>

      {/* Mobile Card Layout */}
      <div className="block sm:hidden">
        <div className="divide-y divide-gray-200">
          {politicalAreaStats
            .sort((a, b) => b.count - a.count)
            .map((area) => {
              const totalEpisodes = politicalAreaStats.reduce(
                (sum, a) => sum + a.count,
                0
              );
              const percentage = ((area.count / totalEpisodes) * 100).toFixed(
                1
              );

              return (
                <div key={area.area_id} className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-gray-900">
                      {area.area_label}
                    </span>
                    <span className="text-sm text-gray-900 font-semibold">
                      {area.count}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Anteil: {percentage}%
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Themenbereich
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Episoden
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Anteil
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {politicalAreaStats
              .sort((a, b) => b.count - a.count)
              .map((area, index) => {
                const totalEpisodes = politicalAreaStats.reduce(
                  (sum, a) => sum + a.count,
                  0
                );
                const percentage = ((area.count / totalEpisodes) * 100).toFixed(
                  1
                );

                return (
                  <tr
                    key={area.area_id}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {area.area_label}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {area.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {percentage}%
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  ) : null;
}
