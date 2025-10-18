import PartiesPageContent from "@/components/PartiesPageContent";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Parteien",
};

export default function PartiesPage() {
  return (
    <Suspense fallback={""}>
      <PartiesPageContent />
    </Suspense>
  );
}
