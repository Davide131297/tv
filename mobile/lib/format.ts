// German-locale formatting helpers.

const MONTHS = [
  "Jan.",
  "Feb.",
  "März",
  "Apr.",
  "Mai",
  "Juni",
  "Juli",
  "Aug.",
  "Sept.",
  "Okt.",
  "Nov.",
  "Dez.",
];

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
];

// "2025-01-14" -> "14. Jan. 2025"
export function formatDate(iso: string): string {
  const d = parseDate(iso);
  if (!d) return iso;
  return `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// "2025-01-14" -> "14. Jan."
export function formatDateShort(iso: string): string {
  const d = parseDate(iso);
  if (!d) return iso;
  return `${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

// "01".."12" -> "Jan".."Dez"
export function monthLabel(mm: string): string {
  const idx = parseInt(mm, 10) - 1;
  return MONTHS_SHORT[idx] ?? mm;
}

// "2025-01" -> "Jan 25"
export function timelineMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const idx = parseInt(m, 10) - 1;
  return `${MONTHS_SHORT[idx] ?? m} ${y?.slice(2) ?? ""}`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("de-DE").format(n);
}

export function formatMillions(n: number): string {
  return `${new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)} Mio.`;
}

export function formatPercent(n: number): string {
  return `${new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n)} %`;
}

function parseDate(iso: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}
