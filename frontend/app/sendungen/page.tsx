import SendungenPageContent from "@/components/SendungenPageContent";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/page-skeletons";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sendungen",
  description:
    "Chronologische Übersicht aller Sendungen mit Politik-Gästen. Alle Episoden von Markus Lanz, Maybrit Illner, Caren Miosga und mehr.",
  openGraph: {
    title: "Sendungen | Polittalk-Watcher",
    description:
      "Komplettes Archiv aller Polit-Talkshow-Sendungen mit Gästelisten.",
  },
};

export default function EpisodesPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <SendungenPageContent />
    </Suspense>
  );
}
