// Zentrale Definition für Politiker-Overrides
// Diese werden verwendet wenn die Abgeordnetenwatch-API mehrdeutige Ergebnisse liefert

interface GuestDetails {
  name: string;
  isPolitician: boolean;
  politicianId: number | null;
  politicianName?: string;
  party?: number;
  partyName?: string;
}

// Spezielle Override-Cases für bestimmte Politiker
export const POLITICIAN_OVERRIDES: Record<string, GuestDetails> = {
  "Manfred Weber": {
    name: "Manfred Weber",
    isPolitician: true,
    politicianId: 28910,
    politicianName: "Manfred Weber",
    party: 3, // CSU
    partyName: "CSU",
  },
  "Michael Kretschmer": {
    name: "Michael Kretschmer",
    isPolitician: true,
    politicianId: 79225,
    politicianName: "Michael Kretschmer",
    party: 2, // CDU
    partyName: "CDU",
  },
  "Philipp Türmer": {
    name: "Philipp Türmer",
    isPolitician: true,
    politicianId: 999001, // Custom ID for politician not in Abgeordnetenwatch
    politicianName: "Philipp Türmer",
    party: 1, // SPD
    partyName: "SPD",
  },
  "Jan van": {
    name: "Jan van Aken",
    isPolitician: true,
    politicianId: 78952,
    politicianName: "Jan van Aken",
    party: 8, // Die Linke
    partyName: "Die Linke",
  },
  "Wolfram Weimer": {
    name: "Wolfram Weimer",
    isPolitician: true,
    politicianId: 9998,
    politicianName: "Wolfram Weimer",
    party: 2,
    partyName: "CDU",
  },
};

// Hilfsfunktion um Override-Prüfung zu zentralisieren
export function checkPoliticianOverride(name: string): GuestDetails | null {
  if (POLITICIAN_OVERRIDES[name]) {
    console.log(
      `✅ Override angewendet für ${name} -> ${POLITICIAN_OVERRIDES[name].partyName}`
    );
    return POLITICIAN_OVERRIDES[name];
  }
  return null;
}
