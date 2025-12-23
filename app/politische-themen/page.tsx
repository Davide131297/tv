import PoliticalAreasPageContent from "@/components/PoliticalAreasPageContent";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politische Themen",
};

export default function PoliticalAreasPage() {
  return (
    <Suspense fallback={""}>
      <PoliticalAreasPageContent />
    </Suspense>
  );
}
