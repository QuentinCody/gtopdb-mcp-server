import type { ApiCatalog } from "@bio-mcp/shared/codemode/catalog";

export const evidenceRecipe: NonNullable<ApiCatalog["workflows"]>[number] = {
  title: "Preserve target detail, cross-references and interaction evidence",
  keywords: ["HGNC", "RGD", "MGI", "species", "target", "evidence"],
  description: "Local evidence routes call native reads and retain their complete JSON and source receipts. Target detail can be richer than list summaries. Keep namespaces, species and repeated interactions separate; cross-references do not establish orthology or equivalent pharmacology. Replace the provider example target ID as needed. No live release is pinned.",
  code: `const targetId = 54;
const detail = await api.get('/evidence/targets/' + targetId);
if (detail?.__api_error || detail?.__stage_error) return detail;
const databaseLinks = await api.get('/evidence/targets/' + targetId + '/databaseLinks');
if (databaseLinks?.__api_error || databaseLinks?.__stage_error) return databaseLinks;
const interactions = await api.get('/evidence/targets/' + targetId + '/interactions');
if (interactions?.__api_error || interactions?.__stage_error) return interactions;
return { targetId, detail, databaseLinks, interactions, dataset_release: null, snapshot_pinned: false };`,
};

export function evidenceEndpoints(native: ApiCatalog["endpoints"]): ApiCatalog["endpoints"] {
  const paths = new Set(["/targets/{targetId}", "/targets/{targetId}/databaseLinks", "/targets/{targetId}/interactions"]);
  return native.filter(endpoint => paths.has(endpoint.path)).map(endpoint => ({ ...endpoint,
    path: `/evidence${endpoint.path}`, category: "evidence",
    summary: `LOCAL evidence wrapper: ${endpoint.summary} Returns {data, _mcp} with original JSON, original-byte SHA-256, request context and incomplete/unpinned scope. Staged handles retain the complete packet.`,
  }));
}
