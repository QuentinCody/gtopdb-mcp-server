import { type Completeness, mergeCompleteness } from "@bio-mcp/shared";

export const GTOPDB_COMPLETENESS: Completeness = { complete: false, truncation: { reason: "unknown",
  detail: "Only this bounded source response is represented; dataset release, all matching records and cross-species equivalence are not established." } };
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
export function gtopdbCompleteness(value: unknown): Completeness | undefined {
  const pending = [value]; const seen = new Set<unknown>(); let found: Completeness | undefined;
  while (pending.length) {
    const item = pending.pop(); if (!item || typeof item !== "object" || seen.has(item)) continue; seen.add(item);
    if (record(item)) for (const key of ["_mcp", "_staging"]) {
      const context = item[key];
      if (record(context) && record(context.completeness) && context.completeness.complete === false) found = mergeCompleteness(found, context.completeness as unknown as Completeness);
    }
    for (const child of Object.values(item)) pending.push(child);
  }
  return found;
}
