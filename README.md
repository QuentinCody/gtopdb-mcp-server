# gtopdb-mcp-server

MCP server for the Guide to PHARMACOLOGY (GtoPdb / IUPHAR) REST web services — the expert-curated catalogue of pharmacological targets, ligands, and their functionally-characterised interactions. Complements ChEMBL: ChEMBL is compound-centric with broad assay data; GtoPdb/IUPHAR is receptor/ligand-centric with curated functional classifications (target families, ligand mechanism, selectivity). Use GtoPdb for receptor pharmacology questions (agonist/antagonist selectivity, family relationships, natural vs synthetic ligands).

- Upstream API: https://www.guidetopharmacology.org/services
- Upstream docs: https://www.guidetopharmacology.org/webServices.jsp
- Auth: provider-issued API key, injected as the `GTP-API-Key` header. Configure the Worker secret with `pnpm exec wrangler secret put GTOPDB_API_KEY` from this server directory (or `GTOPDB_API_KEY` in local `.dev.vars`). Never include the key in Code Mode scripts. See the upstream docs to request access.
- Rate limit: approximately 60 requests/minute. Each call makes one attempt; 429 errors retain the provider's `Retry-After` evidence for the caller.
- Response format: JSON (adapter sends `Accept: application/json`)

## Tools (Code Mode only)

- `gtopdb_search` — discover the curated native endpoints and three local evidence routes
- `gtopdb_execute` — run sandboxed JavaScript against the GtoPdb API via `api.get()`
- `gtopdb_query_data` — SQL over staged responses
- `gtopdb_get_schema` — inspect staged-dataset schemas

Each tool also has an `mcp_` alias. Success and error responses carry both MCP fields and citations. Complete envelopes over 30 KiB stage with `_staging` metadata, including large SQL results; `payloads` retains the original envelope. A response is bounded to 4 MiB and 50 seconds across headers/body. Partial, malformed, oversized and credential-echo responses fail explicitly; bounded native errors are retained with credentials redacted.

## Target evidence

Native routes retain their original array/object shapes. Local `/evidence/targets/{targetId}`, `/evidence/targets/{targetId}/databaseLinks` and `/evidence/targets/{targetId}/interactions` call the same native GETs but return `{data, _mcp}`. These packets retain source JSON, request context, retrieval time and the SHA-256/count of original response bytes. The target evidence recipe retrieves all three sequentially and keeps complete packets or staging handles.

The [2026.3 announcement](https://blog.guidetopharmacology.org/2026/09/16/database-release-2026-3/) describes richer HGNC, RGD and MGI references on single-target records; target lists remain summaries. Keep namespace, species, repeated interactions and unknown fields. Cross-references alone do not establish orthology or equivalent pharmacology. The mutable native service does not pin a dataset release; evidence and execution completeness remain conservative.

Staged SQL tables preserve entity names (`targets`, `ligands`, `interactions`, `families`, `diseases`, `databases`) and add `database_links`/`gtopdb_rows` as appropriate. `source_index` and `native_json` retain order and every native row; `gtopdb_response.native_json` retains the complete root. Scalar columns are convenience projections: mixed string/numeric columns may coerce numeric display, so use native JSON for original types and reserved-name collisions. Restaged SQL output uses ordered `query_rows`; `payloads` independently retains complete source receipts.

## Example (Code Mode)

```js
// GPCR targets with their IUPHAR family membership
const gpcrs = await api.get('/targets', { type: 'GPCR' });
if (gpcrs?.__staged || gpcrs?.__api_error || gpcrs?.__stage_error) return gpcrs;
return gpcrs.slice(0, 5).map(t => ({
  targetId: t.targetId,
  name: t.name,
  familyIds: t.familyIds,
}));
```

Local acceptance uses actual MCP HTTP and SQLite with synthetic source bodies and a local isolate substitute. Authenticated provider behavior and the edited Workerd deployment remain unqualified; see the [response review](../../docs/audits/2026-10-06-gtopdb-response-review.md).

<!-- license-and-data-terms:start -->
## License and data terms

The code in this repository is licensed under the Apache License 2.0 (see `LICENSE`).
If you use it in your work, please cite it (see `CITATION.cff`). Citation is requested, not required.

The license covers the code only. Data that this server returns comes from IUPHAR/BPS Guide to Pharmacology and stays under the terms of that source: ODbL database; CC BY-SA 4.0 contents.
You are responsible for your use of the data under those terms.
<!-- license-and-data-terms:end -->
