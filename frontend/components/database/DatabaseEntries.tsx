"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useUrlUpdater } from "@/hooks/useUrlUpdater";

interface TvShowEntry {
  id: number;
  show_name: string;
  episode_date: string;
  politician_name: string;
  party_name: string | null;
  politician_id: number | null;
  party_id: number | null;
  created_at: string;
  tv_channel: string | null;
}

interface DatabaseEntriesProps {
  initialData: TvShowEntry[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

const FEEDBACK_OPTIONS = [
  {
    value: "politician_not_present",
    label: "Politiker war nicht in der Sendung",
  },
  { value: "politician_incorrect", label: "Politiker fehlerhaft angegeben" },
  { value: "other", label: "Sonstiges" },
];

const GENERAL_FEEDBACK_OPTIONS = [
  { value: "missing_show", label: "Sendung fehlt in der Datenbank" },
  { value: "missing_politician", label: "Politiker fehlt in der Datenbank" },
  {
    value: "functionality_issue",
    label: "Problem mit der Website-Funktionalität",
  },
  { value: "data_quality", label: "Allgemeine Datenqualität" },
  { value: "feature_request", label: "Feature-Wunsch" },
  { value: "other", label: "Sonstiges" },
];

export default function DatabaseEntries({
  initialData,
  totalCount,
  currentPage,
  totalPages,
}: DatabaseEntriesProps) {
  const updateUrl = useUrlUpdater();
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedEntry, setSelectedEntry] = useState<TvShowEntry | null>(null);
  const [feedbackIssueType, setFeedbackIssueType] = useState("");
  const [feedbackDescription, setFeedbackDescription] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const [isGeneralFeedbackOpen, setIsGeneralFeedbackOpen] = useState(false);
  const [generalFeedbackType, setGeneralFeedbackType] = useState("");
  const [generalFeedbackDescription, setGeneralFeedbackDescription] =
    useState("");
  const [generalFeedbackLoading, setGeneralFeedbackLoading] = useState(false);

  const handlePageChange = (newPage: number) => {
    updateUrl({ page: String(newPage) });
  };

  const filteredEntries = initialData.filter(
    (entry) =>
      !searchTerm ||
      entry.politician_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.show_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.party_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.id.toString().includes(searchTerm.toLowerCase()),
  );

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackLoading(true);

    try {
      const { error } = await supabase.from("feedback").insert([
        {
          entry_id: selectedEntry?.id || null,
          issue_type: feedbackIssueType,
          description: feedbackDescription,
          status: "open",
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      setSelectedEntry(null);
      setFeedbackIssueType("");
      setFeedbackDescription("");
      alert("Feedback erfolgreich gesendet!");
    } catch (error) {
      console.error("Fehler beim Senden des Feedbacks:", error);
      alert("Fehler beim Senden des Feedbacks. Bitte versuche es erneut.");
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleGeneralFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralFeedbackLoading(true);

    try {
      const { error } = await supabase.from("feedback").insert([
        {
          entry_id: null,
          issue_type: generalFeedbackType,
          description: generalFeedbackDescription,
          status: "open",
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      setGeneralFeedbackType("");
      setGeneralFeedbackDescription("");
      setIsGeneralFeedbackOpen(false);
      alert("Allgemeines Feedback erfolgreich gesendet!");
    } catch (error) {
      console.error("Fehler beim Senden des allgemeinen Feedbacks:", error);
      alert("Fehler beim Senden des Feedbacks. Bitte versuche es erneut.");
    } finally {
      setGeneralFeedbackLoading(false);
    }
  };

  const closeFeedbackForm = () => {
    setSelectedEntry(null);
    setFeedbackIssueType("");
    setFeedbackDescription("");
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex-1">
            <Input
              placeholder="Suche..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex items-center gap-4">
            <Dialog
              open={isGeneralFeedbackOpen}
              onOpenChange={setIsGeneralFeedbackOpen}
            >
              <DialogTrigger asChild>
                <Button variant="outline" className="whitespace-nowrap">
                  Allgemeines Feedback
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Allgemeines Feedback</DialogTitle>
                  <DialogDescription>
                    Teile uns dein Feedback zu unserer Plattform mit.
                  </DialogDescription>
                </DialogHeader>

                <form
                  onSubmit={handleGeneralFeedbackSubmit}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Art des Feedbacks
                    </label>
                    <Select
                      onValueChange={(value) => setGeneralFeedbackType(value)}
                      value={generalFeedbackType}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wähle eine Kategorie..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {GENERAL_FEEDBACK_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Beschreibung
                    </label>
                    <Textarea
                      value={generalFeedbackDescription}
                      onChange={(e) =>
                        setGeneralFeedbackDescription(e.target.value)
                      }
                      placeholder="Beschreibe dein Feedback detailliert..."
                      rows={4}
                      required
                    />
                  </div>

                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={
                        !generalFeedbackType ||
                        !generalFeedbackDescription ||
                        generalFeedbackLoading
                      }
                    >
                      {generalFeedbackLoading
                        ? "Wird gesendet..."
                        : "Feedback senden"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <div className="text-sm text-gray-600 whitespace-nowrap">
              {totalCount} Einträge gesamt
            </div>
          </div>
        </div>
      </Card>

      {selectedEntry && (
        <Card className="border-2 border-blue-200 bg-blue-50 p-6 dark:border-blue-900/60 dark:bg-blue-950/20">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Feedback für Eintrag #{selectedEntry.id}
          </h3>

          <div className="mb-4 rounded-md bg-white p-4 dark:bg-gray-900/60 dark:ring-1 dark:ring-gray-800">
            <div className="grid grid-cols-1 gap-4 text-sm text-gray-700 dark:text-gray-300 md:grid-cols-3">
              <div>
                <strong className="text-gray-900 dark:text-gray-100">Sendung:</strong>{" "}
                {selectedEntry.show_name}
              </div>
              <div>
                <strong className="text-gray-900 dark:text-gray-100">Sender:</strong>{" "}
                {selectedEntry.tv_channel || "-"}
              </div>
              <div>
                <strong className="text-gray-900 dark:text-gray-100">Datum:</strong>{" "}
                {new Date(selectedEntry.episode_date).toLocaleDateString(
                  "de-DE",
                )}
              </div>
              <div>
                <strong className="text-gray-900 dark:text-gray-100">Politiker:</strong>{" "}
                {selectedEntry.politician_name}
              </div>
              <div>
                <strong className="text-gray-900 dark:text-gray-100">Partei:</strong>{" "}
                {selectedEntry.party_name || "Unbekannt"}
              </div>
            </div>
          </div>

          <form onSubmit={handleFeedbackSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Art des Problems
              </label>
              <Select
                onValueChange={(value) => setFeedbackIssueType(value)}
                value={feedbackIssueType}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wähle eine Option..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {FEEDBACK_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Beschreibung
              </label>
              <Textarea
                value={feedbackDescription}
                onChange={(e) => setFeedbackDescription(e.target.value)}
                placeholder="Beschreibe das Problem detaillierter..."
                rows={4}
                required
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={
                  !feedbackIssueType || !feedbackDescription || feedbackLoading
                }
              >
                {feedbackLoading ? "Wird gesendet..." : "Feedback senden"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={closeFeedbackForm}
              >
                Abbrechen
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden border border-transparent dark:border-gray-800">
        <div className="block lg:hidden">
          <div className="space-y-3 p-4">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="space-y-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900/30"
              >
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    #{entry.id}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedEntry(entry)}
                    disabled={selectedEntry?.id === entry.id}
                    className="text-xs px-2 py-1 h-7"
                  >
                    Feedback
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-medium text-gray-500 dark:text-gray-400">Sendung:</span>
                    <div className="truncate text-gray-900 dark:text-gray-100">
                      {entry.show_name}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500 dark:text-gray-400">Sender:</span>
                    <div className="text-gray-900 dark:text-gray-100">
                      {entry.tv_channel || "-"}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500 dark:text-gray-400">Datum:</span>
                    <div className="text-gray-900 dark:text-gray-100">
                      {new Date(entry.episode_date).toLocaleDateString("de-DE")}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500 dark:text-gray-400">
                      Politiker:
                    </span>
                    <div className="truncate text-gray-900 dark:text-gray-100">
                      {entry.politician_name}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500 dark:text-gray-400">Partei:</span>
                    <div className="text-gray-900 dark:text-gray-100">
                      {entry.party_name || "-"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Sendung
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Sender
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Datum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Politiker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Partei
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-transparent dark:divide-gray-800">
              {filteredEntries.map((entry, index) => (
                <tr
                  key={entry.id}
                  className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                    index % 2 === 0
                      ? "bg-white dark:bg-transparent"
                      : "bg-gray-50 dark:bg-gray-900/30"
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                    {entry.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                    {entry.show_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                    {entry.tv_channel || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                    {new Date(entry.episode_date).toLocaleDateString("de-DE")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                    {entry.politician_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                    {entry.party_name || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedEntry(entry)}
                      disabled={selectedEntry?.id === entry.id}
                    >
                      Feedback
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredEntries.length === 0 && (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            {searchTerm
              ? "Keine Einträge gefunden für deine Suche."
              : "Keine Einträge gefunden."}
          </div>
        )}
      </Card>

      {totalPages > 1 && (
        <Card className="p-4">
          <div className="flex flex-col space-y-3 lg:flex-row lg:space-y-0 lg:items-center lg:justify-between">
            <div className="text-center text-sm text-gray-600 dark:text-gray-400 lg:text-left">
              Seite {currentPage} von {totalPages} ({totalCount} Einträge gesamt)
            </div>
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                Vorherige
              </Button>

              <div className="flex gap-1">
                <div className="flex gap-1 sm:hidden">
                  {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage <= 2) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 1) {
                      pageNum = totalPages - 2 + i;
                    } else {
                      pageNum = currentPage - 1 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="min-w-[40px]"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <div className="hidden sm:flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Nächste
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
