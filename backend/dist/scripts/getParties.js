"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("../db"));
function createPartyTable() {
    return __awaiter(this, void 0, void 0, function* () {
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
        db_1.default.exec(createTableQuery);
        console.log("Party table created successfully");
    });
}
function fetchParties(rangeStart = 0) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `https://www.abgeordnetenwatch.de/api/v2/parties?range_start=${rangeStart}`;
        try {
            const response = yield fetch(url);
            const data = yield response.json();
            console.log(`Fetched ${data.data.length} parties (${rangeStart + 1}-${rangeStart + data.data.length} of ${data.meta.result.total})`);
            return data.data;
        }
        catch (error) {
            console.error("Error fetching parties:", error);
            return [];
        }
    });
}
function insertParties(parties) {
    return __awaiter(this, void 0, void 0, function* () {
        const insertQuery = `
        INSERT OR REPLACE INTO party (id, entity_type, label, api_url, full_name, short_name)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
        const insertStmt = db_1.default.prepare(insertQuery);
        for (const party of parties) {
            insertStmt.run(party.id, party.entity_type, party.label, party.api_url, party.full_name, party.short_name);
        }
        console.log(`Inserted ${parties.length} parties into database`);
    });
}
function getAllParties() {
    return __awaiter(this, void 0, void 0, function* () {
        let allParties = [];
        let rangeStart = 0;
        const batchSize = 100;
        while (true) {
            const parties = yield fetchParties(rangeStart);
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
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("Creating party table...");
            yield createPartyTable();
            console.log("Fetching all parties...");
            const allParties = yield getAllParties();
            console.log("Inserting parties into database...");
            yield insertParties(allParties);
            console.log(`Successfully processed ${allParties.length} parties`);
        }
        catch (error) {
            console.error("Error in main process:", error);
        }
        finally {
            db_1.default.close();
        }
    });
}
if (require.main === module) {
    main();
}
