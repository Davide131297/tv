"use client";

import type { EpisodeData, Statistics } from "@/types";
import LastShowTable from "@/components/LastShowTable";
import ColorBox from "./ui/color-box";

interface SendungenPageContentProps {
  initialEpisodes: EpisodeData[];
  initialStats: Statistics;
  initialShow: string;
  initialYear: string;
}

export default function SendungenPageContent({
  initialEpisodes,
  initialStats,
}: SendungenPageContentProps) {
  return (
    <div className="relative">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 mb-8">
        <ColorBox
          color="blue"
          number={initialStats.total_episodes}
          text="Gesamt-Sendungen"
        />
        <ColorBox
          color="red"
          number={initialStats.total_appearances}
          text="Politiker-Auftritte"
        />
        <ColorBox
          color="green"
          number={initialStats.episodes_with_politicians}
          text="Mit Politik-Gästen"
        />
        <ColorBox
          color="purple"
          number={initialStats.average_politicians_per_episode}
          text="Politiker pro Sendung"
          withSymbol
        />
        <ColorBox
          color="orange"
          number={initialStats.max_politicians_in_episode}
          text="Max. Politiker/Sendung"
        />
      </div>

      <LastShowTable episodes={initialEpisodes} />
    </div>
  );
}
