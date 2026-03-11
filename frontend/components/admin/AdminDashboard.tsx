"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminTableConfig } from "@/lib/admin-schema";

type JsonRecord = Record<string, unknown>;

type TablePayload = {
  table: string;
  totalCount: number;
  columns: string[];
  rows: JsonRecord[];
};

type AdminDashboardProps = {
  tables: Record<string, AdminTableConfig>;
};

type FormState = Record<string, string>;
type PoliticianSuggestion = {
  politician_name: string;
  party_name: string;
  politician_id: string;
  party_id: string;
};

const HIDDEN_TABLE_COLUMNS = new Set(["id", "created_at", "updated_at"]);

const TV_CHANNEL_OPTIONS = [
  "Das Erste",
  "ZDF",
  "RTL",
  "NTV",
  "Phoenix",
  "WELT",
  "Pro 7",
];

const SHOW_NAME_OPTIONS = [
  "Markus Lanz",
  "Maybrit Illner",
  "Caren Miosga",
  "Maischberger",
  "Hart aber fair",
  "Phoenix Runde",
  "Phoenix Persönlich",
  "Pinar Atalay",
  "Blome & Pfeffer",
];

function formatCellValue(value: unknown) {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function isObjectLike(value: unknown) {
  return typeof value === "object" && value !== null;
}

function buildFormState(columns: string[], record?: JsonRecord) {
  return columns.reduce<FormState>((accumulator, column) => {
    const value = record?.[column];

    if (value === null || value === undefined) {
      accumulator[column] = "";
    } else if (isObjectLike(value)) {
      accumulator[column] = JSON.stringify(value, null, 2);
    } else {
      accumulator[column] = String(value);
    }

    return accumulator;
  }, {});
}

function inferValueType(
  column: string,
  formValue: string,
  currentRecord?: JsonRecord,
  sampleRecord?: JsonRecord,
) {
  const referenceValue =
    currentRecord?.[column] !== undefined
      ? currentRecord[column]
      : sampleRecord?.[column];

  if (formValue.trim() === "") {
    return null;
  }

  if (typeof referenceValue === "number") {
    const parsed = Number(formValue);
    if (Number.isNaN(parsed)) {
      throw new Error(`Feld "${column}" erwartet eine Zahl.`);
    }
    return parsed;
  }

  if (typeof referenceValue === "boolean") {
    if (formValue === "true") {
      return true;
    }
    if (formValue === "false") {
      return false;
    }
    throw new Error(`Feld "${column}" erwartet true oder false.`);
  }

  if (isObjectLike(referenceValue)) {
    return JSON.parse(formValue);
  }

  return formValue;
}

function buildRecordFromForm(
  columns: string[],
  formState: FormState,
  currentRecord?: JsonRecord,
  sampleRecord?: JsonRecord,
) {
  return columns.reduce<JsonRecord>((accumulator, column) => {
    accumulator[column] = inferValueType(
      column,
      formState[column] ?? "",
      currentRecord,
      sampleRecord,
    );
    return accumulator;
  }, {});
}

function getInputType(column: string, value: unknown) {
  if (typeof value === "number" || column.endsWith("_id") || column === "id") {
    return "number";
  }

  if (
    typeof value === "string" &&
    (column.includes("date") || /^\d{4}-\d{2}-\d{2}$/.test(value))
  ) {
    return "date";
  }

  return "text";
}

export default function AdminDashboard({ tables }: AdminDashboardProps) {
  const rowsPerPage = 25;
  const tableNames = Object.keys(tables);
  const [activeTable, setActiveTable] = useState(tableNames[0] || "");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [tableData, setTableData] = useState<Record<string, TablePayload>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<JsonRecord | null>(null);
  const [editForm, setEditForm] = useState<FormState>({});
  const [newForm, setNewForm] = useState<FormState>({});

  useEffect(() => {
    if (!activeTable || tableData[activeTable]) {
      return;
    }

    void loadTable(activeTable);
  }, [activeTable, tableData]);

  const currentTable = tableData[activeTable];
  const currentConfig = tables[activeTable];
  const currentColumns = currentTable?.columns || [];
  const visibleTableColumns = currentColumns.filter(
    (column) => !HIDDEN_TABLE_COLUMNS.has(column),
  );
  const isFeedbackTable = activeTable === "feedback";
  const sampleRecord = currentTable?.rows[0];

  useEffect(() => {
    setSelectedRecord(null);
    setSearch("");
    setCurrentPage(1);
    setEditForm(buildFormState(currentColumns));
    setNewForm(buildFormState(currentColumns));
  }, [activeTable, currentColumns.join("|")]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filteredRows = useMemo(() => {
    if (!currentTable?.rows) {
      return [];
    }

    if (!search) {
      return currentTable.rows;
    }

    const lowerSearch = search.toLowerCase();
    return currentTable.rows.filter((row) =>
      JSON.stringify(row).toLowerCase().includes(lowerSearch),
    );
  }, [currentTable, search]);

  const politicianSuggestions = useMemo(() => {
    if (activeTable !== "tv_show_politicians" || !currentTable?.rows) {
      return [];
    }

    const suggestions = new Map<string, PoliticianSuggestion>();

    currentTable.rows.forEach((row) => {
      const politicianName =
        typeof row.politician_name === "string" ? row.politician_name.trim() : "";

      if (!politicianName || suggestions.has(politicianName.toLowerCase())) {
        return;
      }

      suggestions.set(politicianName.toLowerCase(), {
        politician_name: politicianName,
        party_name:
          typeof row.party_name === "string" ? row.party_name : "",
        politician_id:
          row.politician_id === null || row.politician_id === undefined
            ? ""
            : String(row.politician_id),
        party_id:
          row.party_id === null || row.party_id === undefined
            ? ""
            : String(row.party_id),
      });
    });

    return Array.from(suggestions.values()).sort((a, b) =>
      a.politician_name.localeCompare(b.politician_name, "de"),
    );
  }, [activeTable, currentTable]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(startIndex, startIndex + rowsPerPage);
  }, [currentPage, filteredRows]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function loadTable(tableName: string) {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/tables/${tableName}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as TablePayload & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Tabelle konnte nicht geladen werden.");
      }

      setTableData((current) => ({
        ...current,
        [tableName]: data,
      }));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Tabelle konnte nicht geladen werden.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleRowSelect(row: JsonRecord) {
    setSelectedRecord(row);
    setEditForm(buildFormState(currentColumns, row));
  }

  function updateFormValue(
    formType: "edit" | "new",
    column: string,
    value: string,
  ) {
    const applyUpdate = (current: FormState) => {
      const next = { ...current, [column]: value };

      if (column !== "politician_name") {
        return next;
      }

      const match = politicianSuggestions.find(
        (suggestion) =>
          suggestion.politician_name.toLowerCase() === value.trim().toLowerCase(),
      );

      if (!match) {
        return next;
      }

      if ("party_name" in next) {
        next.party_name = match.party_name;
      }
      if ("politician_id" in next) {
        next.politician_id = match.politician_id;
      }
      if ("party_id" in next) {
        next.party_id = match.party_id;
      }

      return next;
    };

    if (formType === "edit") {
      setEditForm(applyUpdate);
      return;
    }

    setNewForm(applyUpdate);
  }

  async function submitRecord(method: "POST" | "PATCH") {
    if (!activeTable) {
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const formState = method === "POST" ? newForm : editForm;
      const currentRecord = method === "PATCH" ? selectedRecord || undefined : undefined;
      const record = buildRecordFromForm(
        currentColumns,
        formState,
        currentRecord,
        sampleRecord,
      );

      const response = await fetch(`/api/admin/tables/${activeTable}`, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ record }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Änderung fehlgeschlagen.");
      }

      await loadTable(activeTable);
      setMessage(
        method === "POST"
          ? "Datensatz wurde angelegt."
          : "Datensatz wurde aktualisiert.",
      );

      if (method === "POST") {
        setNewForm(buildFormState(currentColumns));
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Änderung fehlgeschlagen.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteRecord() {
    if (!activeTable || !selectedRecord) {
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const primaryKey = tables[activeTable].primaryKey;
      const id = selectedRecord[primaryKey];

      if (id === undefined || id === null || id === "") {
        throw new Error(`Primärschlüssel "${primaryKey}" fehlt.`);
      }

      const response = await fetch(`/api/admin/tables/${activeTable}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Löschen fehlgeschlagen.");
      }

      setSelectedRecord(null);
      setEditForm(buildFormState(currentColumns));
      await loadTable(activeTable);
      setMessage("Datensatz wurde gelöscht.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Löschen fehlgeschlagen.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);

    try {
      await fetch("/api/admin/session", {
        method: "DELETE",
      });
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  function renderForm(
    formType: "edit" | "new",
    formState: FormState,
    currentRecord?: JsonRecord,
  ) {
    const primaryKey = currentConfig?.primaryKey;
    const visibleColumns = currentColumns.filter((column) => column !== "id");

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {visibleColumns.map((column) => {
          const referenceValue =
            currentRecord?.[column] !== undefined
              ? currentRecord[column]
              : sampleRecord?.[column];
          const isPrimaryKeyField = formType === "edit" && column === primaryKey;
          const useTextarea = isObjectLike(referenceValue);
          const isTvChannelField = column === "tv_channel";
          const isShowNameField = column === "show_name";
          const isPoliticianNameField =
            activeTable === "tv_show_politicians" && column === "politician_name";
          const fieldValue = formState[column] ?? "";

          return (
            <div
              key={`${formType}-${column}`}
              className={useTextarea ? "md:col-span-2" : ""}
            >
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {column}
              </label>
              {isTvChannelField ? (
                <Select
                  value={fieldValue || undefined}
                  onValueChange={(value) => updateFormValue(formType, column, value)}
                  disabled={isPrimaryKeyField}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sender wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {TV_CHANNEL_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : isShowNameField ? (
                <Select
                  value={fieldValue || undefined}
                  onValueChange={(value) => updateFormValue(formType, column, value)}
                  disabled={isPrimaryKeyField}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sendung wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHOW_NAME_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : useTextarea ? (
                <Textarea
                  value={fieldValue}
                  onChange={(event) =>
                    updateFormValue(formType, column, event.target.value)
                  }
                  className="min-h-32 font-mono text-xs"
                  disabled={isPrimaryKeyField}
                />
              ) : (
                <>
                  <Input
                    type={getInputType(column, referenceValue)}
                    value={fieldValue}
                    onChange={(event) =>
                      updateFormValue(formType, column, event.target.value)
                    }
                    disabled={isPrimaryKeyField}
                    list={
                      isPoliticianNameField
                        ? `${formType}-politician-name-suggestions`
                        : undefined
                    }
                  />
                  {isPoliticianNameField && (
                    <datalist id={`${formType}-politician-name-suggestions`}>
                      {politicianSuggestions.map((suggestion) => (
                        <option
                          key={suggestion.politician_name}
                          value={suggestion.politician_name}
                        />
                      ))}
                    </datalist>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-12rem)] bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.16),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(30,64,175,0.12),_transparent_35%),linear-gradient(135deg,#f8fafc_0%,#e2e8f0_50%,#f8fafc_100%)] px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="border-slate-200/70 bg-white/85 shadow-lg backdrop-blur">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="text-3xl text-slate-950">
                Admin Dashboard
              </CardTitle>
              <CardDescription className="max-w-3xl">
                Vollzugriff auf alle bekannten Supabase-Tabellen. Jede Tabelle hat einen eigenen Tab, und Datensätze lassen sich über Formulare direkt anlegen, ändern und löschen.
              </CardDescription>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => void loadTable(activeTable)}
                disabled={loading}
              >
                Neu laden
              </Button>
              <Button
                variant="secondary"
                onClick={() => void logout()}
                disabled={loading}
              >
                Logout
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="flex flex-wrap gap-2">
          {tableNames.map((tableName) => (
            <button
              key={tableName}
              type="button"
              onClick={() => setActiveTable(tableName)}
              className={[
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                activeTable === tableName
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white/80 text-slate-700 hover:bg-slate-100",
              ].join(" ")}
            >
              {tables[tableName].label}
            </button>
          ))}
        </div>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {message && (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </p>
        )}

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(420px,1fr)]">
          <Card className="border-slate-200/70 bg-white/90 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl text-slate-950">
                {currentConfig?.label || "Tabelle"}
              </CardTitle>
              <CardDescription>
                {currentConfig?.description}{" "}
                {currentTable ? `${currentTable.totalCount} Datensätze geladen.` : ""}
              </CardDescription>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Datensätze durchsuchen..."
              />
              <div className="text-sm text-slate-500">
                Seite {currentPage} von {totalPages}, {filteredRows.length} Treffer
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-100/80">
                    <tr>
                      {visibleTableColumns.map((column) => (
                        <th
                          key={column}
                          className="px-3 py-2 text-left font-semibold text-slate-700"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {paginatedRows.map((row, index) => (
                      <tr
                        key={`${activeTable}-${String(row[currentConfig?.primaryKey || "id"] ?? index)}`}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => handleRowSelect(row)}
                      >
                        {visibleTableColumns.map((column) => (
                          <td
                            key={`${index}-${column}`}
                            className="max-w-[16rem] truncate px-3 py-2 align-top text-slate-700"
                            title={formatCellValue(row[column])}
                          >
                            {column === "abgeordnetenwatch_url" &&
                            typeof row[column] === "string" &&
                            row[column] ? (
                              <a
                                href={row[column] as string}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sky-700 underline underline-offset-2 hover:text-sky-900"
                                onClick={(event) => event.stopPropagation()}
                              >
                                Link öffnen
                              </a>
                            ) : (
                              formatCellValue(row[column])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {!loading && filteredRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={Math.max(visibleTableColumns.length, 1)}
                          className="px-3 py-8 text-center text-slate-500"
                        >
                          Keine Datensätze gefunden.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-slate-500">
                  Zeigt {(currentPage - 1) * rowsPerPage + 1}
                  {"–"}
                  {Math.min(currentPage * rowsPerPage, filteredRows.length)} von{" "}
                  {filteredRows.length}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                  >
                    Zurück
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Weiter
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {isFeedbackTable ? (
              <Card className="border-slate-200/70 bg-white/90 shadow-md">
                <CardHeader>
                  <CardTitle className="text-xl text-slate-950">
                    Feedback-Details
                  </CardTitle>
                  <CardDescription>
                    Feedback aus der öffentlichen Datenbankseite ansehen und bei Bedarf löschen.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedRecord ? (
                    <>
                      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                        <div>
                          <span className="font-medium text-slate-700">
                            Eintrag:
                          </span>{" "}
                          <span className="text-slate-900">
                            {formatCellValue(selectedRecord.entry_id)}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">
                            Typ:
                          </span>{" "}
                          <span className="text-slate-900">
                            {formatCellValue(selectedRecord.issue_type)}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">
                            Status:
                          </span>{" "}
                          <span className="text-slate-900">
                            {formatCellValue(selectedRecord.status)}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">
                            Beschreibung:
                          </span>
                          <p className="mt-1 whitespace-pre-wrap text-slate-900">
                            {formatCellValue(selectedRecord.description)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={() => void deleteRecord()}
                        disabled={!selectedRecord || loading}
                      >
                        Feedback löschen
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Wähle links ein Feedback aus, um es anzusehen oder zu löschen.
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="border-slate-200/70 bg-white/90 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-xl text-slate-950">
                      Datensatz bearbeiten
                    </CardTitle>
                    <CardDescription>
                      Datensatz in der Tabelle anklicken, Felder anpassen und speichern.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {renderForm("edit", editForm, selectedRecord || undefined)}
                    <div className="flex gap-3">
                      <Button
                        onClick={() => void submitRecord("PATCH")}
                        disabled={!selectedRecord || loading}
                      >
                        Speichern
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => void deleteRecord()}
                        disabled={!selectedRecord || loading}
                      >
                        Löschen
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200/70 bg-white/90 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-xl text-slate-950">
                      Datensatz anlegen
                    </CardTitle>
                    <CardDescription>
                      Neuen Datensatz feldweise ausfüllen und direkt in Supabase speichern.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {renderForm("new", newForm)}
                    <Button
                      onClick={() => void submitRecord("POST")}
                      disabled={loading}
                    >
                      Neu anlegen
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
