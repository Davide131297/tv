import PoliticianRankings from "@/components/PoliticianRankings";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politiker-Rankings | TV Talkshow Tracker",
  description:
    "Übersicht über die häufigsten Gäste in deutschen Talkshows - sortiert nach Anzahl der Auftritte",
  keywords: [
    "Politiker",
    "Talkshow",
    "Ranking",
    "Markus Lanz",
    "Maybrit Illner",
    "Caren Miosga",
    "Maischberger",
    "Hart aber fair",
  ],
};

export default function PoliticianRankingsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PoliticianRankings />
    </div>
  );
}
