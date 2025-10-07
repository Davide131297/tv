import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const FETCH_HEADERS = {
  Authorization: `Bearer ${process.env.NEXT_PUBLIC_POLITICS_API_KEY}`,
};

export const POLITICAL_AREA = [
  { id: 1, label: "Energie, Klima und Versorgungssicherheit" },
  { id: 2, label: "Wirtschaft, Innovation und Wettbewerbsfähigkeit" },
  { id: 3, label: "Sicherheit, Verteidigung und Außenpolitik" },
  {
    id: 4,
    label: "Migration, Integration und gesellschaftlicher Zusammenhalt",
  },
  { id: 5, label: "Haushalt, öffentliche Finanzen und Sozialpolitik" },
  { id: 6, label: "Digitalisierung, Medien und Demokratie" },
  { id: 7, label: "Kultur, Identität und Erinnerungspolitik" },
];
