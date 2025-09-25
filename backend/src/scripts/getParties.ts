import db from "../db";
import { AbgeordnetenwatchParty as PartyData } from "../types/abgeordnetenwatch";

interface ApiResponse {
  meta: {
    result: {
      count: number;
      total: number;
      range_start: number;
      range_end: number;
    };
  };
  data: PartyData[];
}

async function createPartyTable() {
  const createTableQuery = `
        CREATE TABLE IF NOT EXISTS party (
            id INTEGER PRIMARY KEY,
            entity_type TEXT,
            label TEXT,
            api_url TEXT,
            full_name TEXT,
            short_name TEXT
        )
    `;

  db.exec(createTableQuery);
  console.log("Party table created successfully");
}

async function fetchParties(rangeStart: number = 0): Promise<PartyData[]> {
  const url = `https://www.abgeordnetenwatch.de/api/v2/parties?range_start=${rangeStart}`;

  try {
    const response = await fetch(url);
    const data: ApiResponse = await response.json();

    console.log(
      `Fetched ${data.data.length} parties (${rangeStart + 1}-${
        rangeStart + data.data.length
      } of ${data.meta.result.total})`
    );

    return data.data;
  } catch (error) {
    console.error("Error fetching parties:", error);
    return [];
  }
}

async function insertParties(parties: PartyData[]) {
  const insertQuery = `
        INSERT OR REPLACE INTO party (id, entity_type, label, api_url, full_name, short_name)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

  const insertStmt = db.prepare(insertQuery);

  for (const party of parties) {
    insertStmt.run(
      party.id,
      party.entity_type,
      party.label,
      party.api_url,
      party.full_name,
      party.short_name
    );
  }

  console.log(`Inserted ${parties.length} parties into database`);
}

async function getAllParties() {
  let allParties: PartyData[] = [];
  let rangeStart = 0;
  const batchSize = 100;

  while (true) {
    const parties = await fetchParties(rangeStart);

    if (parties.length === 0) {
      break;
    }

    allParties = allParties.concat(parties);

    if (parties.length < batchSize) {
      break;
    }

    rangeStart += batchSize;
  }

  return allParties;
}

async function main() {
  try {
    console.log("Creating party table...");
    await createPartyTable();

    console.log("Fetching all parties...");
    const allParties = await getAllParties();

    console.log("Inserting parties into database...");
    await insertParties(allParties);

    console.log(`Successfully processed ${allParties.length} parties`);
  } catch (error) {
    console.error("Error in main process:", error);
  } finally {
    db.close();
  }
}

if (require.main === module) {
  main();
}
