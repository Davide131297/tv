import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { LinkPreview } from "@/components/ui/link-preview";
import { BADGE_PARTY_COLORS } from "@/types";
import { DialogTitle } from "@radix-ui/react-dialog";
import { LoaderOne } from "@/components/ui/loader";
import { ExternalLink } from "lucide-react";

type Appearances = {
  id: string;
  show_name: string;
  episode_date: string;
  episode_url: string;
};

type PoliticianModalProps = {
  politicianName: string;
  politicianParty: string;
  className?: string;
};

export default function PoliticianModal({
  politicianName,
  politicianParty,
  className,
}: PoliticianModalProps) {
  const [appearances, setAppearances] = useState<Appearances[]>([]);
  const [selectedPolitician, setSelectedPolitician] = useState<any | null>(
    null
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState<string | null>(null);
  const nameParts = politicianName.trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ") ?? "";

  async function fetchPoliticianData() {
    setIsLoading(true);
    setError(null);
    let selected = null;
    try {
      const res = await fetch(
        `https://www.abgeordnetenwatch.de/api/v2/politicians?first_name=${encodeURIComponent(
          firstName
        )}&last_name=${encodeURIComponent(lastName)}`
      );

      if (!res.ok) throw new Error("Fehler beim Abrufen der Daten");

      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      let data: any;
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.warn("Erwartetes JSON, erhalten:", text);
        setError("Unerwartete Antwort vom API-Server.");
        setSelectedPolitician(null);
        return;
      }

      const list = Array.isArray(data.data) ? data.data : [];
      if (politicianParty) {
        selected =
          list.find(
            (p: any) =>
              p?.party?.label &&
              p.party.label.toLowerCase() === politicianParty.toLowerCase()
          ) ?? null;
      }
      if (!selected && list.length > 0) {
        selected = list[0];
      }

      console.log("Data received from API:", data);
      console.log("Gefundene Politiker:", list);
      console.log("Ausgewählter Politiker:", selected);
      setSelectedPolitician(selected);

      if (!selected || !selected.id) {
        console.warn(
          "Kein gültiger Politiker oder ID vorhanden — Detailabfrage übersprungen."
        );
        return;
      }

      const detailRes = await fetch(
        `/api/politician-details?id=${encodeURIComponent(selected.id)}`
      );
      if (!detailRes.ok) {
        console.warn("Fehler beim Abrufen der Detaildaten:", detailRes.status);
        return;
      }

      const detailData = await detailRes.json();
      console.log("Detaildaten erhalten:", detailData);

      const wikidataRes = await fetch(
        `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${selected.qid_wikidata}&format=json&origin=*`
      );
      if (!wikidataRes.ok) {
        console.warn(
          "Fehler beim Abrufen der Wikidata-Daten:",
          wikidataRes.status
        );
        return;
      }

      const wikidataJson = await wikidataRes.json();
      const entity = wikidataJson.entities[selected.qid_wikidata];
      const descriptionDe = entity.descriptions.de?.value;

      setDescription(descriptionDe);
      setAppearances(detailData);
    } catch (err) {
      console.error(err);
      setError("Beim Laden der Politikerdaten ist ein Fehler aufgetreten.");
      setSelectedPolitician(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (v) {
              setAppearances([]);
              setError(null);
              setIsLoading(true);
              fetchPoliticianData();
            }
          }}
        >
          <DialogTrigger asChild>
            <span role="button" tabIndex={0} className={className}>
              <span className="truncate">{politicianName}</span>
              <ExternalLink className="w-4 h-4 text-blue-600 md:hidden" />
            </span>
          </DialogTrigger>

          <DialogContent className="w- max-h-[90vh] flex flex-col">
            <DialogTitle className="sr-only">{politicianName}</DialogTitle>
            <div className="px-4 py-4 overflow-y-auto flex-1">
              {isLoading ? (
                <div className="flex flex-col gap-5">
                  <h2 className="text-sm text-gray-600">Lade Daten…</h2>
                  <LoaderOne />
                </div>
              ) : error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : selectedPolitician ? (
                <>
                  <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold">
                        {selectedPolitician.label}
                      </h1>
                      {selectedPolitician.occupation && (
                        <p className="text-sm text-gray-600 mt-1">
                          {selectedPolitician.occupation}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2 items-center">
                        {(() => {
                          const raw =
                            selectedPolitician.party?.label ?? "Unbekannt";
                          const cls =
                            BADGE_PARTY_COLORS[raw] ??
                            "bg-gray-100 text-gray-800 border-gray-200";
                          return (
                            <span
                              className={`text-xs px-2 py-1 rounded ${cls}`}
                            >
                              {selectedPolitician.party?.label ??
                                "Partei unbekannt"}
                            </span>
                          );
                        })()}
                        {selectedPolitician.year_of_birth && (
                          <span className="text-sm text-gray-600">
                            Jg. {selectedPolitician.year_of_birth}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      {selectedPolitician.abgeordnetenwatch_url && (
                        <LinkPreview
                          url={selectedPolitician.abgeordnetenwatch_url}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Profil auf Abgeordnetenwatch
                        </LinkPreview>
                      )}
                    </div>
                  </div>

                  <dl className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5 text-sm text-gray-700 dark:text-gray-200">
                    <div>
                      <dt className="font-medium">Beruf / Tätigkeit</dt>
                      <dd>{description}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Bildung</dt>
                      <dd>{selectedPolitician.education ?? "–"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Wikidata</dt>
                      <dd>
                        {selectedPolitician.qid_wikidata ? (
                          <LinkPreview
                            url={`https://www.wikidata.org/wiki/${selectedPolitician.qid_wikidata}`}
                            className="text-blue-600 hover:underline"
                          >
                            {selectedPolitician.qid_wikidata}
                          </LinkPreview>
                        ) : (
                          "–"
                        )}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-2">Auftritte</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Datum</TableHead>
                          <TableHead>Sendung</TableHead>
                          <TableHead className="hidden md:block">
                            Link zur Sendung
                          </TableHead>
                          <TableHead className="md:hidden">Link</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {appearances.map((ap: Appearances) => (
                          <TableRow key={ap.id}>
                            <TableCell className="whitespace-nowrap text-sm text-gray-600">
                              {format(ap.episode_date, "dd.MM.yyyy")}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {ap.show_name}
                            </TableCell>
                            <TableCell className="text-sm">
                              {ap.episode_url ? (
                                <LinkPreview
                                  url={ap.episode_url}
                                  className="text-blue-600 hover:underline"
                                >
                                  <p className="hidden md:block">
                                    🔗 Episode öffnen
                                  </p>
                                  <p className="md:hidden">🔗 Öffnen</p>
                                </LinkPreview>
                              ) : (
                                "–"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-600">
                  Kein passender Politiker gefunden.
                </p>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="destructive">Schließen</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipTrigger>
      <TooltipContent>
        <span>Mehr Infos zu {politicianName}</span>
      </TooltipContent>
    </Tooltip>
  );
}
