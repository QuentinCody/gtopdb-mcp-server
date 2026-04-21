import { RestStagingDO } from "@bio-mcp/shared/staging/rest-staging-do";
import type { SchemaHints } from "@bio-mcp/shared/staging/schema-inference";

export class GtopdbDataDO extends RestStagingDO {
    protected getSchemaHints(data: unknown): SchemaHints | undefined {
        if (Array.isArray(data)) {
            const sample = data[0];
            if (sample && typeof sample === "object") {
                const obj = sample as Record<string, unknown>;

                // Targets list: targetId + name + type (GPCR, Ion channel, etc.)
                if ("targetId" in obj && ("name" in obj || "type" in obj)) {
                    return {
                        tableName: "targets",
                        indexes: ["targetId", "type", "name"],
                    };
                }
                // Ligands list: ligandId + name
                if ("ligandId" in obj && "name" in obj && !("targetId" in obj)) {
                    return {
                        tableName: "ligands",
                        indexes: ["ligandId", "name", "type", "approved"],
                    };
                }
                // Interactions: both targetId + ligandId present
                if ("targetId" in obj && "ligandId" in obj) {
                    return {
                        tableName: "interactions",
                        indexes: ["targetId", "ligandId", "type", "action", "species"],
                    };
                }
                // Families: familyId + name
                if ("familyId" in obj && "name" in obj) {
                    return {
                        tableName: "families",
                        indexes: ["familyId", "name"],
                    };
                }
                // Diseases
                if ("diseaseId" in obj) {
                    return {
                        tableName: "diseases",
                        indexes: ["diseaseId", "name"],
                    };
                }
                // Databases cross-refs
                if ("databaseId" in obj) {
                    return {
                        tableName: "databases",
                        indexes: ["databaseId", "name"],
                    };
                }
            }
        }

        return undefined;
    }
}
