export type AdminTableConfig = {
  label: string;
  description: string;
  primaryKey: string;
};

export const ADMIN_ROUTE_PATH = "/admin";

export const ADMIN_TABLES: Record<string, AdminTableConfig> = {
  tv_show_politicians: {
    label: "TV Show Politicians",
    description: "Politiker-Auftritte pro Sendung und Episode.",
    primaryKey: "id",
  },
  tv_show_episode_political_areas: {
    label: "Episode Political Areas",
    description: "Zuordnung politischer Themen zu Episoden.",
    primaryKey: "id",
  },
  show_links: {
    label: "Show Links",
    description: "Quell- und Episodenlinks der Sendungen.",
    primaryKey: "id",
  },
  political_area: {
    label: "Political Areas",
    description: "Stammdaten der politischen Themenfelder.",
    primaryKey: "id",
  },
  feedback: {
    label: "Feedback",
    description: "Nutzerfeedback und offene Meldungen.",
    primaryKey: "id",
  },
  episode_factchecks: {
    label: "Episode Factchecks",
    description: "Faktenchecks pro Episode.",
    primaryKey: "id",
  },
  documents: {
    label: "Documents",
    description: "Embedding- und Dokument-Datensätze.",
    primaryKey: "id",
  },
  bot_configuration: {
    label: "Bot Configuration",
    description: "Konfigurationsdaten für Bot-Workflows.",
    primaryKey: "id",
  },
};

export function isAdminTable(tableName: string): tableName is keyof typeof ADMIN_TABLES {
  return tableName in ADMIN_TABLES;
}
