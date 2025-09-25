export type AbgeordnetenwatchParty = {
  id: number;
  entity_type: "party";
  label: string;
  api_url: string;
  full_name: string;
  short_name: string;
};

export type AbgeordnetenwatchPolitician = {
  id: number;
  entity_type: "politician";
  label: string;
  api_url: string;
  abgeordnetenwatch_url: string;
  first_name: string;
  last_name: string;
  birth_name: string | null;
  sex: "m" | "w" | "d" | string;
  year_of_birth: number | null;
  party: AbgeordnetenwatchParty | null;
  party_past: AbgeordnetenwatchParty | null;
  education: string | null;
  residence: string | null;
  occupation: string | null;
  statistic_questions: number;
  statistic_questions_answered: number;
  ext_id_bundestagsverwaltung: string | null;
  qid_wikidata: string | null;
  field_title: string | null;
};
