import { cn } from "@/lib/utils";

type ColorBoxProps = {
  color: string;
  number: number | string;
  text: string;
  withSymbol?: boolean;
};

export default function ColorBox({
  color,
  number,
  text,
  withSymbol = false,
}: ColorBoxProps) {
  switch (color) {
    case "blue":
      return (
        <div className="bg-blue-50 rounded-lg p-4 sm:p-6 border border-blue-200">
          <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-2">
            {number}
          </div>
          <div className="text-xs sm:text-sm text-blue-700 font-medium">
            {text}
          </div>
        </div>
      );
    case "red":
      return (
        <div className="bg-red-50 rounded-lg p-4 sm:p-6 border border-red-200">
          <div className="text-2xl sm:text-3xl font-bold text-red-600 mb-2">
            {number}
          </div>
          <div className="text-xs sm:text-sm text-red-700 font-medium">
            {text}
          </div>
        </div>
      );
    case "green":
      return (
        <div className="bg-green-50 rounded-lg p-4 sm:p-6 border border-green-200">
          <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-2">
            {number}
          </div>
          <div className="text-xs sm:text-sm text-green-700 font-medium">
            {text}
          </div>
        </div>
      );
    case "purple":
      return (
        <div className="bg-purple-50 rounded-lg p-4 sm:p-6 border border-purple-200">
          <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-2">
            <p className={cn(withSymbol ? "inline mr-1" : "hidden")}>ø</p>
            {number}
          </div>
          <div className="text-xs sm:text-sm text-purple-700 font-medium">
            {text}
          </div>
        </div>
      );
    case "orange":
      return (
        <div className="bg-orange-50 rounded-lg p-4 sm:p-6 border border-orange-200">
          <div className="text-2xl sm:text-3xl font-bold text-orange-600 mb-2">
            {number}
          </div>
          <div className="text-xs sm:text-sm text-orange-700 font-medium">
            {text}
          </div>
        </div>
      );
    default:
      return null;
  }
}
