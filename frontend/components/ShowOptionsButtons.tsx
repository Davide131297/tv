import { SHOW_OPTIONS, SHOW_OPTIONS_WITHOUT_ALL } from "@/types";
import { cn } from "@/lib/utils";

export function getShowButtonColor(showValue: string) {
  switch (showValue) {
    case "all":
      return "bg-black text-white hover:bg-gray-800 hover:text-white";
    case "Markus Lanz":
      return "bg-orange-100 text-orange-800 hover:bg-orange-200";
    case "Maybrit Illner":
      return "bg-purple-100 text-purple-800 hover:bg-purple-200";
    case "Caren Miosga":
      return "bg-green-100 text-green-800 hover:bg-green-200";
    case "Maischberger":
      return "bg-teal-100 text-teal-800 hover:bg-teal-200";
    case "Hart aber fair":
      return "bg-blue-100 text-blue-800 hover:bg-blue-200";
    case "Phoenix Runde":
    case "Phoenix Persönlich":
      return "bg-cyan-100 text-cyan-800 hover:bg-cyan-200";
    case "Pinar Atalay":
      return "bg-rose-100 text-pink-800 hover:bg-rose-200";
    case "Blome & Pfeffer":
      return "bg-rose-100 text-pink-800 hover:bg-rose-200";
    default:
      return "bg-gray-100 text-gray-700 hover:bg-gray-200";
  }
}

export default function ShowOptionsButtons({
  onShowChange,
  selectedShow,
  withAll = true,
}: {
  onShowChange: (show: string) => void;
  selectedShow: string;
  withAll?: boolean;
}) {
  const shows = withAll ? SHOW_OPTIONS : SHOW_OPTIONS_WITHOUT_ALL;
  return (
    <div className="flex flex-wrap gap-2 items-center mb-4">
      {shows.map((option) => {
        return (
          <button
            key={option.value}
            onClick={() => onShowChange(option.value)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
              selectedShow === option.value
                ? option.btnColor
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
