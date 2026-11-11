import type { ApiFetchFn } from "@bio-mcp/shared/codemode/catalog";

export function fail(message: string, status = 400, data?: unknown): never { throw Object.assign(new Error(message), { status, data }); }

/** Keep the existing native read surface; evidence routes select the same three GETs. */
export function gtopdbRequest(request: Parameters<ApiFetchFn>[0], apiKey?: string) {
  if (request.method.toUpperCase() !== "GET" || request.body !== undefined) fail("GtoPdb supports GET without a body", 405);
  const key = apiKey?.trim();
  if (!key) fail("GtoPdb requires GTOPDB_API_KEY in the Worker environment. Request API access at https://www.guidetopharmacology.org/webServices.jsp.", 401);
  const evidence = request.path.startsWith("/evidence/");
  const path = evidence ? request.path.slice("/evidence".length) : request.path;
  const [pathname, query] = path.split("?");
  if (!pathname.startsWith("/") || path.split("?").length > 2 || /[\\#]/.test(path) || [...path].some(char => char.charCodeAt(0) <= 32) || pathname.includes("..") || /%(?:2e|2f|5c)/i.test(pathname)) fail("Invalid GtoPdb path");
  if (evidence && !/^\/targets\/\d+(?:\/(?:databaseLinks|interactions))?$/.test(pathname)) fail("Unknown GtoPdb evidence route");
  const params = new URLSearchParams(query);
  const names = new Set<string>();
  for (const [name] of params) { if (names.has(name)) fail("Repeated GtoPdb parameter"); names.add(name); }
  for (const [name, value] of Object.entries(request.params ?? {})) {
    if (value === undefined || value === null) continue;
    if (!["string", "number", "boolean"].includes(typeof value) || typeof value === "number" && !Number.isFinite(value)) fail("GtoPdb parameters must be finite primitives");
    if (names.has(name) && params.get(name) !== String(value)) fail("Conflicting GtoPdb parameter");
    params.set(name, String(value));
  }
  if ([...params.keys()].some(name => name.toLowerCase() === "gtp-api-key")) fail("Configure the GtoPdb key on the Worker; never put it in query parameters");
  const url = new URL(`https://www.guidetopharmacology.org/services${pathname}`);
  url.search = params.toString();
  if (new TextEncoder().encode(url.toString()).byteLength > 32_000) fail("GtoPdb encoded URL exceeds byte limit");
  return { url, key, evidence, request: { method: "GET", path: pathname, params: Object.fromEntries(params) } };
}
