import { SHOW_OPTIONS, SHOW_OPTIONS_WITHOUT_ALL } from "@/types";
import { cn } from "@/lib/utils";

export function getChannelButtonColor(channelValue: string) {
  switch (channelValue) {
    case "Das Erste":
      return "bg-blue-100 text-blue-800 hover:bg-blue-200";
    case "ZDF":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
    // case "Phoenix":
    //   return "bg-cyan-100 text-cyan-800 hover:bg-cyan-200";
    // case "RTL":
    // case "NTV":
    //   return "bg-red-100 text-red-800 hover:bg-red-200";
    // case "Pro 7":
    //   return "bg-purple-100 text-purple-800 hover:bg-purple-200";
    default:
      return "bg-gray-100 text-gray-700 hover:bg-gray-200";
  }
}

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
    // case "Phoenix Runde":
    // case "Phoenix Persönlich":
    //   return "bg-cyan-100 text-cyan-800 hover:bg-cyan-200";
    // case "Pinar Atalay":
    // case "Blome & Pfeffer":
    //   return "bg-rose-100 text-pink-800 hover:bg-rose-200";
    default:
      return "bg-gray-100 text-gray-700 hover:bg-gray-200";
  }
}

// Neue Hilfsfunktion: ordnet eine Show dem Kanal zu (laut deiner Liste)
function getShowChannel(showName: string) {
  switch (showName) {
    case "Markus Lanz":
    case "Maybrit Illner":
      return "ZDF";
    case "Maischberger":
    case "Hart aber fair":
    case "Caren Miosga":
      return "Das Erste";
    // case "Phoenix Runde":
    // case "Phoenix Persönlich":
    //   return "Phoenix";
    // case "Pinar Atalay":
    // case "Blome & Pfeffer":
    //   return "NTV";
    default:
      return "";
  }
}

export default function ShowOptionsButtons({
  onShowChange,
  selectedShow,
  selectedChannel,
  withAll = true,
}: {
  onShowChange: (show: string) => void;
  selectedShow: string;
  selectedChannel?: string;
  withAll?: boolean;
}) {
  const shows = withAll ? SHOW_OPTIONS : SHOW_OPTIONS_WITHOUT_ALL;

  return (
    <div className="flex flex-wrap gap-2 items-center mb-4">
      {shows.map((option) => {
        const showChannel = getShowChannel(option.value);
        const activeClass =
          selectedShow === option.value &&
          (!selectedChannel || option.value !== "all")
            ? option.btnColor
            : selectedChannel &&
              selectedShow === "all" &&
              showChannel === selectedChannel
            ? getChannelButtonColor(selectedChannel)
            : "bg-gray-100 text-gray-700 hover:bg-gray-200";

        return (
          <button
            key={option.value}
            onClick={() => {
              onShowChange(option.value);
            }}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
              activeClass
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
