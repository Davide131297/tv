import PoliticianRankings from "@/components/PoliticianRankings";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politiker-Rankings",
};

export default function PoliticianRankingsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PoliticianRankings />
    </div>
  );
}
