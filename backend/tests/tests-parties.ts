import { describe, test, expect, afterAll } from "@jest/globals";
import db from "../src/db";
import { AbgeordnetenwatchParty as PartyData } from "../src/types/abgeordnetenwatch";

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

async function fetchPartiesFromApi(): Promise<PartyData[]> {
  let allParties: PartyData[] = [];
  let rangeStart = 0;
  const batchSize = 100;

  while (true) {
    const url = `https://www.abgeordnetenwatch.de/api/v2/parties?range_start=${rangeStart}`;

    try {
      const response = await fetch(url);
      const data: ApiResponse = await response.json();

      if (data.data.length === 0) {
        break;
      }

      allParties = allParties.concat(data.data);

      if (data.data.length < batchSize) {
        break;
      }

      rangeStart += batchSize;
    } catch (error) {
      console.error("Error fetching from API:", error);
      break;
    }
  }

  return allParties;
}

function getPartiesFromDatabase(): PartyData[] {
  const query = `SELECT id, entity_type, label, api_url, full_name, short_name FROM party ORDER BY id`;
  const rows = db.prepare(query).all() as PartyData[];

  return rows.map((row: PartyData) => ({
    id: row.id,
    entity_type: row.entity_type,
    label: row.label,
    api_url: row.api_url,
    full_name: row.full_name,
    short_name: row.short_name,
  }));
}

function compareParties(apiParties: PartyData[], dbParties: PartyData[]) {
  console.log(`API parties count: ${apiParties.length}`);
  console.log(`Database parties count: ${dbParties.length}`);

  if (apiParties.length !== dbParties.length) {
    console.error("❌ Count mismatch between API and database!");
    return false;
  }

  // Create maps for easier comparison
  const apiMap = new Map(apiParties.map((party) => [party.id, party]));
  const dbMap = new Map(dbParties.map((party) => [party.id, party]));

  let identical = true;

  for (const [id, apiParty] of apiMap) {
    const dbParty = dbMap.get(id);

    if (!dbParty) {
      console.error(`❌ Party with ID ${id} exists in API but not in database`);
      identical = false;
      continue;
    }

    // Compare all fields
    const fieldsToCompare: (keyof PartyData)[] = [
      "entity_type",
      "label",
      "api_url",
      "full_name",
      "short_name",
    ];

    for (const field of fieldsToCompare) {
      if (apiParty[field] !== dbParty[field]) {
        console.error(
          `❌ Party ID ${id}: ${field} mismatch - API: "${apiParty[field]}", DB: "${dbParty[field]}"`
        );
        identical = false;
      }
    }
  }

  // Check for parties in DB but not in API
  for (const [id] of dbMap) {
    if (!apiMap.has(id)) {
      console.error(`❌ Party with ID ${id} exists in database but not in API`);
      identical = false;
    }
  }

  return identical;
}

async function testParties() {
  try {
    console.log("🔄 Fetching parties from API...");
    const apiParties = await fetchPartiesFromApi();

    console.log("🔄 Getting parties from database...");
    const dbParties = getPartiesFromDatabase();

    console.log("🔄 Comparing data...");
    const isIdentical = compareParties(apiParties, dbParties);

    if (isIdentical) {
      console.log("✅ API and database data are identical!");
    } else {
      console.error("❌ API and database data differ!");
    }
  } catch (error) {
    console.error("Error during test:", error);
  } finally {
    db.close();
  }
}

// Jest test
describe("Parties Data Sync", () => {
  test("API and database parties should be identical", async () => {
    console.log("🔄 Fetching parties from API...");
    const apiParties = await fetchPartiesFromApi();

    console.log("🔄 Getting parties from database...");
    const dbParties = getPartiesFromDatabase();

    console.log("🔄 Comparing data...");
    const isIdentical = compareParties(apiParties, dbParties);

    expect(isIdentical).toBe(true);
  }, 60000); // 60 second timeout

  afterAll(() => {
    db.close();
  });
});
