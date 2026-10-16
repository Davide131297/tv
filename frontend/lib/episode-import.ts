// Typen des Admin-Link-Imports; die Logik liegt im Backend (backend/src/lib/episode-import*.ts)
export type ImportPreviewGuest = {
  name: string;
  role: string;
  isPolitician: boolean;
  politician_id: number | null;
  politician_name: string | null;
  party_id: number | null;
  party_name: string | null;
  abgeordnetenwatch_url: string | null;
  alreadyInDb: boolean;
  // Treffer bei abgeordnetenwatch, aber die Seite nennt keine passende Partei
  needsReview: boolean;
};

export type ImportPreview = {
  url: string;
  show_name: string | null;
  tv_channel: string | null;
  episode_date: string | null;
  guests: ImportPreviewGuest[];
  warnings: string[];
};

export type ImportPolitician = {
  politician_id: number;
  politician_name: string;
  party_id: number | null;
  party_name: string | null;
  abgeordnetenwatch_url: string | null;
};

export type ImportConfirmPayload = {
  show_name: string;
  episode_date: string;
  tv_channel: string | null;
  politicians: ImportPolitician[];
};
