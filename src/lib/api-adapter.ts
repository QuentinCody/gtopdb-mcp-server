import type { ApiFetchFn } from "@bio-mcp/shared/codemode/catalog";
import { gtopdbFetch } from "./http";
import { fail } from "./request";
import { GTOPDB_COMPLETENESS } from "./completeness";

/** Native paths keep their original shapes; explicit evidence paths add source receipts. */
export function createGtopdbApiFetch(apiKey?: string): ApiFetchFn {
  return async request => {
    if (request.method.toUpperCase() !== "GET" || request.body !== undefined) fail("GtoPdb supports GET without a body", 405);
    const result = await gtopdbFetch(request.path, request.params, { apiKey });
    const data = result.evidence ? { data: result.data, _mcp: { provenance: result.provenance, completeness: GTOPDB_COMPLETENESS,
      dataset_release: null, snapshot_pinned: false, note: "Preserve provider namespaces, species and repeated evidence. Cross-references do not establish orthology or identical pharmacology; this request does not pin the current provider release." } } : result.data;
    return { status: result.status, data, completeness: GTOPDB_COMPLETENESS, upstreamTotal: null };
  };
}
