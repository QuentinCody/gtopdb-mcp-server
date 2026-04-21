# gtopdb-mcp-server

MCP server for the Guide to PHARMACOLOGY (GtoPdb / IUPHAR) REST web services — the expert-curated catalogue of pharmacological targets, ligands, and their functionally-characterised interactions. Complements ChEMBL: ChEMBL is compound-centric with broad assay data; GtoPdb/IUPHAR is receptor/ligand-centric with curated functional classifications (target families, ligand mechanism, selectivity). Use GtoPdb for receptor pharmacology questions (agonist/antagonist selectivity, family relationships, natural vs synthetic ligands).

- Upstream API: https://www.guidetopharmacology.org/services
- Upstream docs: https://www.guidetopharmacology.org/webServices.jsp
- Auth: none. Rate limit: undocumented — be polite.
- Response format: JSON (adapter sends `Accept: application/json`)

## Tools (Code Mode only)

- `gtopdb_search` — discover endpoints from the curated catalog (22 endpoints across `targets`, `ligands`, `interactions`, `families`, `diseases`, `databases` categories)
- `gtopdb_execute` — run sandboxed JavaScript against the GtoPdb API via `api.get()`
- `gtopdb_query_data` — SQL over staged responses
- `gtopdb_get_schema` — inspect staged-dataset schemas

## Example (Code Mode)

```js
// GPCR targets with their IUPHAR family membership
const gpcrs = await api.get('/targets', { type: 'GPCR' });
return gpcrs.slice(0, 5).map(t => ({
  targetId: t.targetId,
  name: t.name,
  familyIds: t.familyIds,
}));
```
