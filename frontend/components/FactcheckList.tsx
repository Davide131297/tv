"use client";

import { useState } from "react";
import type {
  Factcheck,
  FactCheckEntry,
  CoreStatement,
} from "@/lib/factcheck-data";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────────
// Verdict config (new format uses German/English verdict strings)
// ────────────────────────────────────────────────────────────

type VerdictStyle = {
  label: string;
  bg: string;
  text: string;
  badge: string;
  dot: string;
  dotColor: string;
};

function getVerdictStyle(verdict: string): VerdictStyle {
  const v = verdict?.toUpperCase() ?? "";

  if (v === "WAHR" || v === "ZUTREFFEND") {
    return {
      label: "Wahr",
      bg: "bg-emerald-50 border-emerald-200",
      text: "text-emerald-700",
      badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500",
      dotColor: "bg-emerald-500",
    };
  }
  if (
    v.includes("WEITGEHEND") ||
    v === "TEILWEISE ZUTREFFEND" ||
    v === "TEILWEISE WAHR"
  ) {
    return {
      label: "Weitgehend wahr",
      bg: "bg-emerald-50/60 border-emerald-200/60",
      text: "text-emerald-600",
      badge: "bg-emerald-50 text-emerald-600 border-emerald-200",
      dot: "bg-emerald-400",
      dotColor: "bg-emerald-400",
    };
  }
  if (v.includes("PLAUSIBEL")) {
    return {
      label: "Plausibel",
      bg: "bg-blue-50 border-blue-200",
      text: "text-blue-700",
      badge: "bg-blue-100 text-blue-700 border-blue-200",
      dot: "bg-blue-400",
      dotColor: "bg-blue-400",
    };
  }
  if (v.includes("EINSCHÄTZUNG") || v.includes("NICHT MESSBAR")) {
    return {
      label: "Einschätzung",
      bg: "bg-purple-50 border-purple-200",
      text: "text-purple-700",
      badge: "bg-purple-100 text-purple-700 border-purple-200",
      dot: "bg-purple-400",
      dotColor: "bg-purple-400",
    };
  }
  if (v.includes("NICHT") || v.includes("UNBELEGT") || v.includes("UNGENAU")) {
    return {
      label: verdict.length > 30 ? "Nicht belegt" : verdict,
      bg: "bg-gray-50 border-gray-200",
      text: "text-gray-600",
      badge: "bg-gray-100 text-gray-600 border-gray-200",
      dot: "bg-gray-400",
      dotColor: "bg-gray-400",
    };
  }
  if (v.includes("FALSCH") || v.includes("FEHLER") || v === "EHER FALSCH") {
    return {
      label: "Falsch / Ungenau",
      bg: "bg-red-50 border-red-200",
      text: "text-red-700",
      badge: "bg-red-100 text-red-700 border-red-200",
      dot: "bg-red-500",
      dotColor: "bg-red-500",
    };
  }
  // Fallback
  return {
    label: verdict,
    bg: "bg-gray-50 border-gray-200",
    text: "text-gray-600",
    badge: "bg-gray-100 text-gray-600 border-gray-200",
    dot: "bg-gray-400",
    dotColor: "bg-gray-400",
  };
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function isCoreStatementObject(s: unknown): s is CoreStatement {
  return (
    typeof s === "object" && s !== null && "speaker" in s && "statement" in s
  );
}

// ────────────────────────────────────────────────────────────
// FactCheckEntryCard
// ────────────────────────────────────────────────────────────

function FactCheckEntryCard({ entry }: { entry: FactCheckEntry }) {
  // Support both new format (verdict/explanation/statement) and old format (bewertung/begruendung/aussage)
  const isNewFormat = !!entry.verdict;
  const style = isNewFormat
    ? getVerdictStyle(entry.verdict)
    : getVerdictStyle(entry.bewertung ?? "unbelegt");

  const statement = isNewFormat ? entry.statement : (entry.aussage ?? "");
  const explanation = isNewFormat
    ? entry.explanation
    : (entry.begruendung ?? "");
  const speaker = entry.speaker;

  // Sources: new format has { url, title }[], old format has string[]
  const sources: { url: string; label: string }[] = [];
  if (isNewFormat && entry.sources) {
    entry.sources.forEach((s) => {
      try {
        new URL(s.url);
        sources.push({
          url: s.url,
          label: s.title || new URL(s.url).hostname.replace(/^www\./, ""),
        });
      } catch {
        /* skip invalid */
      }
    });
  } else if (entry.quellen) {
    entry.quellen.forEach((url) => {
      try {
        sources.push({
          url,
          label: new URL(url).hostname.replace(/^www\./, ""),
        });
      } catch {
        /* skip invalid */
      }
    });
  }

  return (
    <div className={cn("rounded-xl border p-4 transition-all", style.bg)}>
      {/* Header: badge + speaker */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0",
            style.badge,
          )}
        >
          <span
            className={cn("inline-block w-1.5 h-1.5 rounded-full", style.dot)}
          />
          {style.label}
        </span>
        {speaker && (
          <span className="text-xs text-gray-400 font-medium text-right leading-tight">
            {speaker}
          </span>
        )}
      </div>

      {/* Statement (quote) */}
      <p className="text-sm text-gray-800 font-medium leading-snug mb-2">
        &ldquo;{statement}&rdquo;
      </p>

      {/* Explanation */}
      <p className="text-xs text-gray-600 leading-relaxed">{explanation}</p>

      {/* Legacy: wissensstand_hinweis */}
      {entry.wissensstand_hinweis && (
        <p className="mt-2 text-xs text-gray-500 italic border-t border-gray-200 pt-2">
          💡 {entry.wissensstand_hinweis}
        </p>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <div className="mt-2.5 pt-2.5 border-t border-black/5">
          <p className="text-xs font-medium text-gray-400 mb-1.5">Quellen</p>
          <div className="flex flex-wrap gap-1.5">
            {sources.map((src, i) => (
              <a
                key={i}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                title={src.label}
                className="inline-flex items-center gap-1 text-xs text-indigo-600 bg-white border border-indigo-100 rounded-full px-2.5 py-0.5 hover:bg-indigo-50 hover:border-indigo-200 transition-colors max-w-[220px] truncate"
              >
                <svg
                  className="w-3 h-3 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                <span className="truncate">{src.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Verdict summary dots
// ────────────────────────────────────────────────────────────

function VerdictSummary({ factchecks }: { factchecks: FactCheckEntry[] }) {
  const groups: Record<string, { count: number; style: VerdictStyle }> = {};

  factchecks.forEach((entry) => {
    const raw = entry.verdict ?? entry.bewertung ?? "unbelegt";
    const style = getVerdictStyle(raw);
    const key = style.label;
    if (!groups[key]) groups[key] = { count: 0, style };
    groups[key].count++;
  });

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {Object.entries(groups).map(([label, { count, style }]) => (
        <span
          key={label}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium",
            style.text,
          )}
        >
          <span
            className={cn("inline-block w-2 h-2 rounded-full", style.dot)}
          />
          {count}× {label}
        </span>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// FactcheckCard
// ────────────────────────────────────────────────────────────

function FactcheckCard({ fc }: { fc: Factcheck }) {
  const [expanded, setExpanded] = useState(false);

  // Normalize core_statements to display items
  const statements = fc.core_statements.map((s) =>
    isCoreStatementObject(s)
      ? { speaker: s.speaker, text: s.statement }
      : { speaker: null, text: s as unknown as string },
  );

  return (
    <article className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all duration-200 group">
      {/* Header button */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left p-5 flex items-start justify-between gap-4"
      >
        <div className="flex-1 min-w-0">
          {/* Show + Date */}
          <div className="flex items-center gap-2 flex-wrap mb-2.5">
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2.5 py-0.5">
              {fc.show_name}
            </span>
            <span className="text-xs text-gray-400">
              {formatDate(fc.episode_date)}
            </span>
            <span className="text-xs text-gray-300">·</span>
            <span className="text-xs text-gray-400">
              {fc.fact_checks.length} Checks
            </span>
            {fc.episode_url && (
              <>
                <span className="text-xs text-gray-300">·</span>
                <a
                  href={fc.episode_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-indigo-500 hover:text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  Zur Sendung
                </a>
              </>
            )}
          </div>

          {/* Verdict summary */}
          {fc.fact_checks.length > 0 && (
            <VerdictSummary factchecks={fc.fact_checks} />
          )}

          {/* Preview: first statement */}
          {!expanded && statements.length > 0 && (
            <p className="text-sm text-gray-500 mt-2.5 line-clamp-2 leading-relaxed">
              {statements[0].speaker && (
                <span className="font-medium text-gray-600">
                  {statements[0].speaker}:{" "}
                </span>
              )}
              {statements[0].text}
            </p>
          )}
        </div>

        {/* Chevron */}
        <span
          className={cn(
            "cursor-pointer shrink-0 p-1 -mt-1 -mr-1 rounded-full text-gray-400 group-hover:text-gray-600 hover:bg-gray-100 transition-all duration-200",
            expanded && "rotate-180",
          )}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100">
          <div className="px-5 py-5 space-y-6">
            {/* Kernaussagen */}
            {statements.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
                  Kernaussagen{" "}
                  <span className="text-gray-300 font-normal normal-case tracking-normal">
                    ({statements.length})
                  </span>
                </h3>
                <ul className="space-y-2.5">
                  {statements.map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="text-gray-300 shrink-0 tabular-nums w-4 text-right mt-0.5">
                        {i + 1}.
                      </span>
                      <span className="leading-relaxed text-gray-700">
                        {s.speaker && (
                          <span className="font-semibold text-gray-500 text-xs mr-1.5 bg-gray-100 rounded px-1.5 py-0.5">
                            {s.speaker}
                          </span>
                        )}
                        {s.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Fakt-Checks */}
            {fc.fact_checks.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
                  Fakt-Checks{" "}
                  <span className="text-gray-300 font-normal normal-case tracking-normal">
                    ({fc.fact_checks.length})
                  </span>
                </h3>
                <div className="space-y-2.5">
                  {fc.fact_checks.map((entry, i) => (
                    <FactCheckEntryCard key={i} entry={entry} />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

// ────────────────────────────────────────────────────────────
// FactcheckList (export)
// ────────────────────────────────────────────────────────────

export default function FactcheckList({
  factchecks,
}: {
  factchecks: Factcheck[];
}) {
  if (factchecks.length === 0) {
    return (
      <div className="text-center py-24">
        <div className="text-5xl mb-4 opacity-30">🔍</div>
        <p className="text-base font-medium text-gray-600 mb-1.5">
          Noch keine Faktchecks vorhanden
        </p>
        <p className="text-sm text-gray-400 max-w-xs mx-auto leading-relaxed">
          Die KI-Analyse wird automatisch beim nächsten Crawl-Durchlauf
          erstellt.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <p className="text-xs text-gray-400 mb-4 tabular-nums">
        {factchecks.length} {factchecks.length === 1 ? "Analyse" : "Analysen"}{" "}
        gefunden
      </p>
      {factchecks.map((fc) => (
        <FactcheckCard key={fc.id} fc={fc} />
      ))}
    </div>
  );
}
