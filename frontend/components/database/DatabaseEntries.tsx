"use client";

import { useState, useEffect } from "react";
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

interface TvShowEntry {
  id: number;
  show_name: string;
  episode_date: string;
  politician_name: string;
  party_name: string | null;
  politician_id: number | null;
  party_id: number | null;
  created_at: string;
}

interface DatabaseEntriesResponse {
  entries: TvShowEntry[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

const FEEDBACK_OPTIONS = [
  { value: "missing_politician", label: "Fehlender Politiker" },
  {
    value: "politician_not_present",
    label: "Politiker war nicht in der Sendung",
  },
  { value: "politician_incorrect", label: "Politiker fehlerhaft angegeben" },
  { value: "other", label: "Sonstiges" },
];

export default function DatabaseEntries() {
  const [entries, setEntries] = useState<TvShowEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // Feedback states
  const [selectedEntry, setSelectedEntry] = useState<TvShowEntry | null>(null);
  const [feedbackIssueType, setFeedbackIssueType] = useState("");
  const [feedbackDescription, setFeedbackDescription] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const fetchEntries = async (currentPage: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/database-entries?page=${currentPage}&limit=50`
      );

      if (!response.ok) {
        throw new Error("Fehler beim Laden der Daten");
      }

      const data: DatabaseEntriesResponse = await response.json();
      setEntries(data.entries);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
      setPage(data.page);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ein unerwarteter Fehler ist aufgetreten"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries(1);
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchEntries(newPage);
    }
  };

  const filteredEntries = entries.filter(
    (entry) =>
      !searchTerm ||
      entry.politician_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.show_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.party_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.id.toString().includes(searchTerm.toLowerCase())
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

      if (error) {
        throw error;
      }

      // Reset form
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

  const closeFeedbackForm = () => {
    setSelectedEntry(null);
    setFeedbackIssueType("");
    setFeedbackDescription("");
  };

  if (loading && entries.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Lade Datenbank-Einträge...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
        <Button onClick={() => fetchEntries(page)} className="mt-4">
          Erneut versuchen
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
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
          <div className="text-sm text-gray-600">
            {totalCount} Einträge gesamt
          </div>
        </div>
      </Card>

      {/* Feedback Form Modal */}
      {selectedEntry && (
        <Card className="p-6 border-2 border-blue-200 bg-blue-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Feedback für Eintrag #{selectedEntry.id}
          </h3>

          <div className="bg-white p-4 rounded-md mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong>Sendung:</strong> {selectedEntry.show_name}
              </div>
              <div>
                <strong>Datum:</strong>{" "}
                {new Date(selectedEntry.episode_date).toLocaleDateString(
                  "de-DE"
                )}
              </div>
              <div>
                <strong>Politiker:</strong> {selectedEntry.politician_name}
              </div>
              <div>
                <strong>Partei:</strong>{" "}
                {selectedEntry.party_name || "Unbekannt"}
              </div>
            </div>
          </div>

          <form onSubmit={handleFeedbackSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
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

      {/* Entries Table */}
      <Card className="overflow-hidden">
        {/* Mobile View */}
        <div className="block lg:hidden">
          <div className="space-y-3 p-4">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="border border-gray-200 rounded-lg p-3 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium text-gray-900">
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
                    <span className="text-gray-500 font-medium">Sendung:</span>
                    <div className="text-gray-900 truncate">
                      {entry.show_name}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">Datum:</span>
                    <div className="text-gray-900">
                      {new Date(entry.episode_date).toLocaleDateString("de-DE")}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">
                      Politiker:
                    </span>
                    <div className="text-gray-900 truncate">
                      {entry.politician_name}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">Partei:</span>
                    <div className="text-gray-900">
                      {entry.party_name || "-"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sendung
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Datum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Politiker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Partei
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.show_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(entry.episode_date).toLocaleDateString("de-DE")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.politician_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.party_name || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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

        {filteredEntries.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            {searchTerm
              ? "Keine Einträge gefunden für deine Suche."
              : "Keine Einträge gefunden."}
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="p-4">
          <div className="flex flex-col space-y-3 lg:flex-row lg:space-y-0 lg:items-center lg:justify-between">
            <div className="text-sm text-gray-600 text-center lg:text-left">
              Seite {page} von {totalPages} ({totalCount} Einträge gesamt)
            </div>
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
              >
                Vorherige
              </Button>

              {/* Page numbers - responsive */}
              <div className="flex gap-1">
                {/* Mobile: max 3 buttons, Desktop: max 5 buttons */}
                <div className="flex gap-1 sm:hidden">
                  {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 3) {
                      pageNum = i + 1;
                    } else if (page <= 2) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 1) {
                      pageNum = totalPages - 2 + i;
                    } else {
                      pageNum = page - 1 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === page ? "default" : "outline"}
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
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === page ? "default" : "outline"}
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
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
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
