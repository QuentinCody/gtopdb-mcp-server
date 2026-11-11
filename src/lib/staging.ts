const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);

export function nativeGtopdb(value: unknown): unknown {
  const data = record(value) && Array.isArray(value.content) && record(value.structuredContent) && "data" in value.structuredContent ? value.structuredContent.data : value;
  const provenance = record(data) && "data" in data && record(data._mcp) && record(data._mcp.provenance) ? data._mcp.provenance : {};
  if (typeof provenance.raw_json === "string") {
    try { return JSON.parse(provenance.raw_json.replace(/^\uFEFF/, "")); } catch { /* Invalid source evidence remains in payloads. */ }
  }
  return data;
}

function tableName(rows: unknown[]): string {
  const sample = rows.find(record);
  if (!sample) return "gtopdb_rows";
  // Interactions also have targetId and sometimes name/type.
  if ("targetId" in sample && "ligandId" in sample) return "interactions";
  if ("targetId" in sample) return "targets";
  if ("ligandId" in sample) return "ligands";
  if ("familyId" in sample) return "families";
  if ("diseaseId" in sample) return "diseases";
  if ("databaseId" in sample) return "databases";
  if ("database" in sample && "accession" in sample) return "database_links";
  return "gtopdb_rows";
}

function project(value: unknown, source_index: number) {
  const row: Record<string, unknown> = { source_index, native_json: JSON.stringify(value) };
  const used = new Set(["source_index", "native_json", "_rowid", "rowid", "oid", "_rowid_"]);
  if (record(value)) for (const [key, item] of Object.entries(value)) {
    if (used.has(key.toLowerCase()) || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key)) continue;
    used.add(key.toLowerCase());
    if (item === null || ["string", "number", "boolean"].includes(typeof item)) row[key] = item;
  }
  return row;
}

/** Ordered SQL projections are conveniences; native_json and payloads retain every field. */
export function gtopdbTables(data: unknown): unknown {
  if (!record(data) && !Array.isArray(data)) return data;
  if (record(data) && typeof data.sql === "string" && Array.isArray(data.rows)) return { query_rows: data.rows.map((row, row_index) => ({ row_index, native_json: JSON.stringify(row) })) };
  const rows = Array.isArray(data) ? data : [data];
  return { gtopdb_response: [{ response_index: 0, native_json: JSON.stringify(data) }], [tableName(rows)]: rows.map(project) };
}

export function gtopdbColumnTypes(tables: unknown): Record<string, "TEXT" | "INTEGER"> {
  const types: Record<string, "TEXT" | "INTEGER"> = { source_index: "INTEGER", response_index: "INTEGER", row_index: "INTEGER", native_json: "TEXT" };
  if (record(tables)) for (const rows of Object.values(tables)) if (Array.isArray(rows)) for (const row of rows) if (record(row)) {
    for (const [key, value] of Object.entries(row)) if (typeof value === "string") types[key] = "TEXT";
  }
  return types;
}
