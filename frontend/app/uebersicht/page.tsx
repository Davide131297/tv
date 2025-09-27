import { Suspense } from "react";
import OverviewPageContent from "@/components/OverviewPageContent";

export default function OverviewPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Lade Daten...</span>
          </div>
        </div>
      }
    >
      <OverviewPageContent />
    </Suspense>
  );
}
