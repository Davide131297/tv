"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ImportConfirmPayload,
  ImportPreview,
  ImportPreviewGuest,
} from "@/lib/episode-import";

type EpisodeLinkImportProps = {
  showOptions: string[];
  channelOptions: string[];
  onSaved: (message: string) => Promise<void> | void;
};

function isSelectable(guest: ImportPreviewGuest) {
  return guest.isPolitician && guest.politician_id !== null && !guest.alreadyInDb;
}

export default function EpisodeLinkImport({
  showOptions,
  channelOptions,
  onSaved,
}: EpisodeLinkImportProps) {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [showName, setShowName] = useState("");
  const [tvChannel, setTvChannel] = useState("");
  const [episodeDate, setEpisodeDate] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<"analyze" | "save" | null>(null);
  const [error, setError] = useState("");

  function resetPreview() {
    setPreview(null);
    setSelected(new Set());
    setError("");
  }

  async function analyze() {
    setBusy("analyze");
    resetPreview();

    try {
      const response = await fetch("/api/admin/import-episode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json()) as {
        preview?: ImportPreview;
        error?: string;
      };

      if (!response.ok || !data.preview) {
        throw new Error(data.error || "Link konnte nicht ausgewertet werden.");
      }

      const result = data.preview;
      setPreview(result);
      setShowName(result.show_name ?? "");
      setTvChannel(result.tv_channel ?? "");
      setEpisodeDate(result.episode_date ?? "");
      // Reine Interview-Gäste sind keine Talkrunden-Gäste und werden nicht vorausgewählt
      setSelected(
        new Set(
          result.guests
            .map((guest, index) =>
              isSelectable(guest) && !/interview/i.test(guest.role) ? index : -1,
            )
            .filter((index) => index >= 0),
        ),
      );
    } catch (analyzeError) {
      setError(
        analyzeError instanceof Error
          ? analyzeError.message
          : "Link konnte nicht ausgewertet werden.",
      );
    } finally {
      setBusy(null);
    }
  }

  function toggleGuest(index: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  async function confirm() {
    if (!preview) {
      return;
    }

    setBusy("save");
    setError("");

    try {
      const payload: ImportConfirmPayload = {
        show_name: showName,
        episode_date: episodeDate,
        tv_channel: tvChannel || null,
        politicians: preview.guests
          .filter((guest, index) => selected.has(index) && isSelectable(guest))
          .map((guest) => ({
            politician_id: guest.politician_id as number,
            politician_name: guest.politician_name ?? guest.name,
            party_id: guest.party_id,
            party_name: guest.party_name,
            abgeordnetenwatch_url: guest.abgeordnetenwatch_url,
          })),
      };

      const response = await fetch("/api/admin/import-episode/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        inserted?: unknown[];
        skipped?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Speichern fehlgeschlagen.");
      }

      const insertedCount = data.inserted?.length ?? 0;
      const skippedText = data.skipped
        ? ` ${data.skipped} bereits vorhanden und übersprungen.`
        : "";

      resetPreview();
      setUrl("");
      await onSaved(
        `${insertedCount} Politiker für ${payload.show_name} (${payload.episode_date}) gespeichert.${skippedText}`,
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Speichern fehlgeschlagen.",
      );
    } finally {
      setBusy(null);
    }
  }

  const selectedCount = preview
    ? preview.guests.filter((guest, index) => selected.has(index) && isSelectable(guest))
        .length
    : 0;
  const canConfirm =
    selectedCount > 0 && !!showName && /^\d{4}-\d{2}-\d{2}$/.test(episodeDate);

  return (
    <div className="space-y-4 rounded-lg border border-sky-200 bg-sky-50/60 p-4">
      <div>
        <label
          htmlFor="episode-import-url"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Aus Link importieren
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="episode-import-url"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && url.trim() && !busy) {
                event.preventDefault();
                void analyze();
              }
            }}
            placeholder="https://www1.wdr.de/daserste/hartaberfair/index.html"
            className="bg-white"
          />
          <Button
            onClick={() => void analyze()}
            disabled={!url.trim() || busy !== null}
          >
            {busy === "analyze" ? "Analysiere…" : "Analysieren"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Gäste werden von der Seite gelesen und mit abgeordnetenwatch abgeglichen.
          Gespeichert wird erst nach deiner Bestätigung.
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {preview && (
        <div className="space-y-4">
          {preview.warnings.length > 0 && (
            <ul className="space-y-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {preview.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                show_name
              </label>
              <Select value={showName || undefined} onValueChange={setShowName}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Sendung wählen" />
                </SelectTrigger>
                <SelectContent>
                  {showOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                episode_date
              </label>
              <Input
                type="date"
                value={episodeDate}
                onChange={(event) => setEpisodeDate(event.target.value)}
                className="bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                tv_channel
              </label>
              <Select value={tvChannel || undefined} onValueChange={setTvChannel}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Sender wählen" />
                </SelectTrigger>
                <SelectContent>
                  {channelOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {preview.guests.length > 0 && (
            <ul className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white">
              {preview.guests.map((guest, index) => {
                const selectable = isSelectable(guest);
                const inputId = `episode-import-guest-${index}`;

                return (
                  <li
                    key={`${guest.name}-${index}`}
                    className={[
                      "flex items-start gap-3 px-3 py-2 text-sm",
                      selectable ? "" : "bg-slate-50 text-slate-500",
                    ].join(" ")}
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={selectable && selected.has(index)}
                      disabled={!selectable}
                      onChange={() => toggleGuest(index)}
                    />
                    <label htmlFor={inputId} className="min-w-0 flex-1">
                      <span className="font-medium text-slate-900">
                        {guest.politician_name ?? guest.name}
                      </span>
                      {guest.party_name && (
                        <span className="text-slate-700"> · {guest.party_name}</span>
                      )}
                      {guest.politician_id !== null && (
                        <span className="text-slate-400"> · ID {guest.politician_id}</span>
                      )}
                      {guest.role && (
                        <span className="block truncate text-xs text-slate-500">
                          Seite: {guest.role}
                        </span>
                      )}
                    </label>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {!guest.isPolitician && (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                          kein Politiker
                        </span>
                      )}
                      {guest.alreadyInDb && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                          bereits gespeichert
                        </span>
                      )}
                      {selectable && guest.needsReview && (
                        <span
                          className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800"
                          title="abgeordnetenwatch-Treffer, aber die Seite nennt keine passende Partei. Bitte prüfen, ob es die richtige Person ist."
                        >
                          bitte prüfen
                        </span>
                      )}
                      {guest.abgeordnetenwatch_url && (
                        <a
                          href={guest.abgeordnetenwatch_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-sky-700 underline underline-offset-2 hover:text-sky-900"
                        >
                          Profil
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => void confirm()}
              disabled={!canConfirm || busy !== null}
            >
              {busy === "save"
                ? "Speichere…"
                : `Bestätigen & ${selectedCount} speichern`}
            </Button>
            <Button
              variant="outline"
              onClick={resetPreview}
              disabled={busy !== null}
            >
              Verwerfen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
