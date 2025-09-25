"use client";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface PartyStats {
  party_id: number;
  count: number;
  party_name: string;
}

interface PartyChartProps {
  data: PartyStats[];
}

// Party colors für Chart.js
const PARTY_COLORS: Record<string, { bg: string; border: string }> = {
  CDU: { bg: "rgba(0, 0, 0, 0.8)", border: "rgba(0, 0, 0, 1)" },
  CSU: { bg: "rgba(30, 64, 175, 0.8)", border: "rgba(30, 64, 175, 1)" },
  SPD: { bg: "rgba(220, 38, 38, 0.8)", border: "rgba(220, 38, 38, 1)" },
  FDP: { bg: "rgba(250, 204, 21, 0.8)", border: "rgba(250, 204, 21, 1)" },
  "Die Linke": {
    bg: "rgba(147, 51, 234, 0.8)",
    border: "rgba(147, 51, 234, 1)",
  },
  "BÜNDNIS 90/DIE GRÜNEN": {
    bg: "rgba(34, 197, 94, 0.8)",
    border: "rgba(34, 197, 94, 1)",
  },
  Grüne: { bg: "rgba(34, 197, 94, 0.8)", border: "rgba(34, 197, 94, 1)" },
  AfD: { bg: "rgba(37, 99, 235, 0.8)", border: "rgba(37, 99, 235, 1)" },
  BSW: { bg: "rgba(161, 98, 7, 0.8)", border: "rgba(161, 98, 7, 1)" },
  parteilos: {
    bg: "rgba(107, 114, 128, 0.8)",
    border: "rgba(107, 114, 128, 1)",
  },
};

export default function PartyChart({ data }: PartyChartProps) {
  // Sortiere Daten nach Anzahl
  const sortedData = [...data].sort((a, b) => b.count - a.count);

  const chartData = {
    labels: sortedData.map((item) => item.party_name),
    datasets: [
      {
        label: "Anzahl Auftritte",
        data: sortedData.map((item) => item.count),
        backgroundColor: sortedData.map(
          (item) => PARTY_COLORS[item.party_name]?.bg || "rgba(75, 85, 99, 0.8)"
        ),
        borderColor: sortedData.map(
          (item) =>
            PARTY_COLORS[item.party_name]?.border || "rgba(75, 85, 99, 1)"
        ),
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Legende ausblenden da Labels selbsterklärend sind
      },
      title: {
        display: true,
        text: "Partei-Auftritte bei Markus Lanz",
        font: {
          size: 18,
          weight: "bold" as const,
        },
        padding: {
          bottom: 30,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "white",
        bodyColor: "white",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        callbacks: {
          label: function (context: TooltipItem<"bar">) {
            const total = sortedData.reduce((sum, item) => sum + item.count, 0);
            const rawValue = context.raw as number;
            const percentage = ((rawValue / total) * 100).toFixed(1);
            return `${rawValue} Auftritte (${percentage}%)`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: {
            size: 12,
          },
        },
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
      },
      x: {
        ticks: {
          font: {
            size: 12,
            weight: "bold" as const,
          },
          maxRotation: 45,
          minRotation: 0,
        },
        grid: {
          display: false,
        },
      },
    },
    animation: {
      duration: 1000,
      easing: "easeOutQuart" as const,
    },
    interaction: {
      intersect: false,
      mode: "index" as const,
    },
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="h-96">
        <Bar data={chartData} options={options} />
      </div>
      <div className="mt-4 text-sm text-gray-600 text-center">
        Gesamt: {sortedData.reduce((sum, item) => sum + item.count, 0)}{" "}
        Auftritte
      </div>
    </div>
  );
}
