import SendungenPageContent from "@/components/SendungenPageContent";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sendungen",
};

export default function EpisodesPage() {
  return (
    <Suspense fallback={""}>
      <SendungenPageContent />
    </Suspense>
  );
}
