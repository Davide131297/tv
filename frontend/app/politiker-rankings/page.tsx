import PoliticianRankings from "@/components/PoliticianRankings";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politiker-Rankings",
};

export default function PoliticianRankingsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <PoliticianRankings />
    </div>
  );
}
