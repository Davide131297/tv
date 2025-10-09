export default function ShowOptionsButtons(showValue: string) {
  switch (showValue) {
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
    default:
      return "bg-black text-white hover:bg-gray-800 hover:text-white";
  }
}
