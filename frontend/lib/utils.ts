import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const FETCH_HEADERS = {
  Authorization: `Bearer ${process.env.NEXT_PUBLIC_POLITICS_API_KEY}`,
};
