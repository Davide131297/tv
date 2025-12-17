"use client";
import { ExternalLink } from "lucide-react";

export default function YearReview2025Button() {
  return (
    <p
      className="text-black/70 hover:text-black/90 hover:underline cursor-pointer flex items-center"
      onClick={() => {
        window.dispatchEvent(new Event("year-review-2025:open"));
      }}
    >
      Jahresrückblick 2025
      <ExternalLink className="inline-block ml-1 mb-0.5" size={14} />
    </p>
  );
}
