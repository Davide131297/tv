import { Skeleton } from "@/components/ui/skeleton";

/**
 * A pulsing skeleton overlay that appears on top of existing content during refetching.
 * Replaces the old spinner-based overlay.
 */
export function LoadingOverlay({ text = "Lade Daten..." }: { text?: string }) {
  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-lg min-h-[200px]">
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1.5">
          <Skeleton className="h-3 w-3 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <Skeleton className="h-3 w-3 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <Skeleton className="h-3 w-3 rounded-full animate-bounce" />
        </div>
        <span className="text-sm text-gray-500 font-medium">{text}</span>
      </div>
    </div>
  );
}
