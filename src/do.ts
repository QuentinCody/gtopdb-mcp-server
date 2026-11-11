import { RestStagingDO } from "@bio-mcp/shared/staging/rest-staging-do";
import type { SchemaHints } from "@bio-mcp/shared/staging/schema-inference";
import { gtopdbColumnTypes, gtopdbTables, nativeGtopdb } from "./lib/staging";

export class GtopdbDataDO extends RestStagingDO {
  protected getTabularData(value: unknown): unknown {
    return gtopdbTables(nativeGtopdb(value));
  }

  protected getSchemaHints(value: unknown): SchemaHints | undefined {
    const data = nativeGtopdb(value);
    if (!data || typeof data !== "object") return undefined;
    return { columnTypes: gtopdbColumnTypes(gtopdbTables(data)) };
  }
}
