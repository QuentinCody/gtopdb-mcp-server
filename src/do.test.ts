/// <reference types="node" />
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("cloudflare:workers", () => ({ RpcTarget: class {}, DurableObject: class { constructor(public ctx: unknown, public env: unknown) {} } }));
import { GtopdbDataDO } from "./do";

const databases: DatabaseSync[] = [];
afterEach(() => { for (const database of databases.splice(0)) database.close(); });
async function store(data: unknown) {
  const database = new DatabaseSync(":memory:"); databases.push(database);
  let ready: Promise<unknown> = Promise.resolve();
  const exec = (sql: string, ...args: SQLInputValue[]) => {
    const rows = database.prepare(sql).all(...args);
    return { toArray: () => rows, one: () => rows[0], [Symbol.iterator]: () => rows[Symbol.iterator]() };
  };
  const ctx = { blockConcurrencyWhile: (run: () => Promise<unknown>) => { ready = run(); return ready; },
    storage: { sql: { exec }, transactionSync: (run: () => unknown) => {
      database.exec("BEGIN"); try { const result = run(); database.exec("COMMIT"); return result; }
      catch (error) { database.exec("ROLLBACK"); throw error; }
    } } };
  // This test fixture implements only the Durable Object storage interfaces used here.
  const instance = new GtopdbDataDO(ctx as unknown as ConstructorParameters<typeof GtopdbDataDO>[0], {} as ConstructorParameters<typeof GtopdbDataDO>[1]);
  await ready;
  const result = await instance.fetch(new Request("https://fixture/process", { method: "POST", body: JSON.stringify({ data }) }));
  expect(await result.json()).toMatchObject({ success: true });
  return database;
}

it("keeps interactions distinct from targets, repeated rows and sparse optional fields", async () => {
  const rows = [{ targetId: "0054", ligandId: "0001", type: "Agonist", affinity: "<1", species: "Human", nested: { refs: [7, 7] } }, { targetId: "0054", ligandId: "0001", name: "Synthetic", affinity: null }, { targetId: "0054", ligandId: "0001", affinity: 0 }];
  const db = await store(rows);
  const actual = db.prepare("SELECT source_index, native_json, targetId, ligandId, affinity FROM interactions ORDER BY source_index").all();
  expect(actual.map(row => JSON.parse(String(row.native_json)))).toEqual(rows);
  expect(actual.map(row => row.targetId)).toEqual(["0054", "0054", "0054"]);
  expect(actual.map(row => row.affinity)).toEqual(["<1", null, "0.0"]);
  expect(db.prepare("SELECT name FROM sqlite_master WHERE name='targets'").all()).toEqual([]);
});
it("preserves detail-only fields, reserved collisions, namespaces and source JSON", async () => {
  const data = { targetId: "0054", name: "Synthetic α😀", _mcp: { native: true }, native_json: "native field", TARGETID: "collision", databaseLinks: [{ database: "HGNC", accession: "001", species: "Human" }, { database: "RGD", accession: "001", species: "Rat" }, { database: "MGI", accession: "001", species: "Mouse" }] };
  const db = await store({ data, _mcp: { provenance: { raw_json: "\uFEFF" + JSON.stringify(data) } } });
  expect(db.prepare("SELECT targetId FROM targets").get()?.targetId).toBe("0054");
  expect(JSON.parse(String(db.prepare("SELECT native_json FROM gtopdb_response").get()?.native_json))).toEqual(data);
  const links = await store(data.databaseLinks);
  expect(links.prepare("SELECT database,accession,species FROM database_links ORDER BY source_index").all()).toEqual(data.databaseLinks);
});
it.each([[], [null, 0, "001"], { ligandId: "001" }, { familyId: "001" }, { diseaseId: "001" }, { databaseId: "001" }])("retains empty, primitive and sparse native structures %#", async data => {
  const db = await store(data);
  expect(JSON.parse(String(db.prepare("SELECT native_json FROM gtopdb_response").get()?.native_json))).toEqual(data);
});
it("keeps serialized evidence in payloads and preserves restaged SQL row order", async () => {
  const data = [{ targetId: "0054", unknown: "α" }];
  const db = await store(JSON.stringify(data));
  const stored = JSON.parse(String(db.prepare("SELECT root_json FROM payloads WHERE id=1").get()?.root_json));
  expect(typeof stored === "string" ? JSON.parse(stored) : stored).toEqual(data);
  const rows = [{ _rowid: 7, accession: "001" }, { _rowid: 7, accession: null }];
  const queries = await store({ content: [], structuredContent: { data: { sql: "SELECT * FROM fixture", rows } } });
  expect(queries.prepare("SELECT native_json FROM query_rows ORDER BY row_index").all().map(row => JSON.parse(String(row.native_json)))).toEqual(rows);
});
