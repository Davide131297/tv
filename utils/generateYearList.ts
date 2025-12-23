export function generateYearList(
  start: number,
  end = new Date().getFullYear()
): string[] {
  const years: string[] = [];
  for (let y = end; y >= start; y--) {
    years.push(String(y));
  }
  return years;
}
