import type { ApiCatalog } from "@bio-mcp/shared/codemode/catalog";

export const gtopdbCatalog: ApiCatalog = {
    name: "Guide to PHARMACOLOGY (GtoPdb / IUPHAR)",
    baseUrl: "https://www.guidetopharmacology.org/services",
    version: "2.0",
    auth: "none",
    endpointCount: 17,
    notes:
        "Complements ChEMBL — ChEMBL is compound-centric with broad assay data; " +
        "GtoPdb/IUPHAR is receptor/ligand-centric with curated functional classifications " +
        "(target families, ligand mechanism, selectivity). Use GtoPdb for receptor pharmacology " +
        "questions (agonist/antagonist selectivity, family relationships, natural vs synthetic ligands).\n" +
        "\n" +
        "API notes:\n" +
        "- All responses are JSON. Base URL: https://www.guidetopharmacology.org/services.\n" +
        "- Target types: 'GPCR', 'NHR', 'LGIC', 'VGIC', 'OtherIC', 'Enzyme', 'CatalyticReceptor',\n" +
        "  'Transporter', 'OtherProtein', 'AccessoryProtein'.\n" +
        "- Ligand types: 'Synthetic organic', 'Metabolite', 'Natural product', 'Endogenous peptide',\n" +
        "  'Peptide', 'Antibody', 'Inorganic', 'Approved', 'Withdrawn', 'Labelled', 'INN'.\n" +
        "- Interaction action types: 'Activator', 'Agonist', 'Allosteric modulator', 'Antagonist',\n" +
        "  'Antibody', 'Channel blocker', 'Gating inhibitor', 'Inhibitor', 'Subunit-specific'.\n" +
        "- Affinity parameters: 'pA2', 'pEC50', 'pIC50', 'pKB', 'pKd', 'pKi'.\n" +
        "  Either 'affinityParameter' (documented) or 'affinityType' (seen in upstream examples)\n" +
        "  works on /interactions and /targets/{id}/interactions.\n" +
        "- Target families live under /targets/families (NOT /families). Likewise ligand families\n" +
        "  live under /ligands/families. There is no root /families endpoint.\n" +
        "- External database cross-references are exposed per-entity via\n" +
        "  /targets/{id}/databaseLinks and /ligands/{id}/databaseLinks (no root /databases endpoint).\n" +
        "- The full /refs list is large (>30k refs) and slow; prefer filtered or paged use.\n" +
        "- Species filter uses common names ('Human', 'Mouse', 'Rat', etc.).",
    endpoints: [
        // ─── Targets ────────────────────────────────────────────────
        {
            method: "GET",
            path: "/targets",
            summary:
                "List targets. Filter by type (GPCR, Enzyme, Transporter, NHR, LGIC, VGIC, CatalyticReceptor, OtherIC, OtherProtein, AccessoryProtein), name, geneSymbol, ecNumber, accession+database.",
            category: "targets",
            queryParams: [
                { name: "type", type: "string", required: false, description: "Target class abbreviation", enum: ["GPCR", "NHR", "LGIC", "VGIC", "OtherIC", "Enzyme", "CatalyticReceptor", "Transporter", "OtherProtein", "AccessoryProtein"] },
                { name: "name", type: "string", required: false, description: "Search targets by name" },
                { name: "geneSymbol", type: "string", required: false, description: "Human/mouse/rat gene symbol" },
                { name: "ecNumber", type: "string", required: false, description: "Enzyme Commission (EC) number" },
                { name: "accession", type: "string", required: false, description: "External database accession (pair with 'database')" },
                { name: "database", type: "string", required: false, description: "Name of the cross-reference database (default: UniProt)" },
                { name: "immuno", type: "boolean", required: false, description: "Filter to GtoImmuPdb-tagged targets" },
                { name: "malaria", type: "boolean", required: false, description: "Filter to GtoMPdb-tagged targets" },
            ],
        },
        {
            method: "GET",
            path: "/targets/{targetId}",
            summary: "Fetch a single target record by GtoPdb target Id.",
            category: "targets",
            pathParams: [
                { name: "targetId", type: "number", required: true, description: "GtoPdb target Id (integer)" },
            ],
        },
        {
            method: "GET",
            path: "/targets/{targetId}/function",
            summary: "Functional annotations for a target (optionally filtered by species).",
            category: "targets",
            pathParams: [
                { name: "targetId", type: "number", required: true, description: "GtoPdb target Id" },
            ],
            queryParams: [
                { name: "species", type: "string", required: false, description: "Species common name (e.g. 'Human', 'Mouse', 'Rat')" },
            ],
        },
        {
            method: "GET",
            path: "/targets/{targetId}/naturalLigands",
            summary: "Endogenous / natural ligands for a target.",
            category: "targets",
            pathParams: [
                { name: "targetId", type: "number", required: true, description: "GtoPdb target Id" },
            ],
        },
        {
            method: "GET",
            path: "/targets/{targetId}/synonyms",
            summary: "Name synonyms for a target.",
            category: "targets",
            pathParams: [
                { name: "targetId", type: "number", required: true, description: "GtoPdb target Id" },
            ],
        },
        {
            method: "GET",
            path: "/targets/{targetId}/databaseLinks",
            summary:
                "External database cross-references for a target (UniProt, Ensembl, OMIM, PDB, HGNC, etc.). " +
                "Use this in place of a non-existent root /databases endpoint.",
            category: "databases",
            pathParams: [
                { name: "targetId", type: "number", required: true, description: "GtoPdb target Id" },
            ],
            queryParams: [
                { name: "species", type: "string", required: false, description: "Species common name" },
                { name: "database", type: "string", required: false, description: "Restrict to one external database" },
            ],
        },

        // ─── Ligands ────────────────────────────────────────────────
        {
            method: "GET",
            path: "/ligands",
            summary:
                "List ligands. Filter by type (Approved, Withdrawn, Synthetic organic, Metabolite, Natural product, Endogenous peptide, Peptide, Antibody, Inorganic, Labelled, INN), name, geneSymbol, accession+database, inchikey, and many physchem cut-offs (logP, molWeight, TPSA, hBond donors/acceptors, rotatable bonds, Lipinsky).",
            category: "ligands",
            queryParams: [
                { name: "type", type: "string", required: false, description: "Ligand type filter", enum: ["Synthetic organic", "Metabolite", "Natural product", "Endogenous peptide", "Peptide", "Antibody", "Inorganic", "Approved", "Withdrawn", "Labelled", "INN"] },
                { name: "name", type: "string", required: false, description: "Search ligands by name" },
                { name: "geneSymbol", type: "string", required: false, description: "Gene symbol of associated target" },
                { name: "accession", type: "string", required: false, description: "External database accession (pair with 'database')" },
                { name: "database", type: "string", required: false, description: "Cross-reference database name (default: PubChemCID)" },
                { name: "inchikey", type: "string", required: false, description: "Full InChIKey or first 14 chars for backbone match" },
                { name: "immuno", type: "boolean", required: false, description: "Filter to GtoImmuPdb-tagged ligands" },
                { name: "malaria", type: "boolean", required: false, description: "Filter to GtoMPdb-tagged ligands" },
                { name: "antibacterial", type: "boolean", required: false, description: "Filter to antibacterial-tagged ligands" },
                { name: "logpGt", type: "number", required: false, description: "Lower cut-off for calculated LogP" },
                { name: "logpLt", type: "number", required: false, description: "Upper cut-off for calculated LogP" },
                { name: "molWeightGt", type: "number", required: false, description: "Lower cut-off for molecular weight" },
                { name: "molWeightLt", type: "number", required: false, description: "Upper cut-off for molecular weight" },
            ],
        },
        {
            method: "GET",
            path: "/ligands/{ligandId}",
            summary: "Fetch a single ligand record by GtoPdb ligand Id.",
            category: "ligands",
            pathParams: [
                { name: "ligandId", type: "number", required: true, description: "GtoPdb ligand Id (integer)" },
            ],
        },
        {
            method: "GET",
            path: "/ligands/{ligandId}/structure",
            summary: "SMILES, InChI, and InChIKey for a ligand.",
            category: "ligands",
            pathParams: [
                { name: "ligandId", type: "number", required: true, description: "GtoPdb ligand Id" },
            ],
        },
        {
            method: "GET",
            path: "/ligands/similarity",
            summary:
                "Ligand structure similarity search (Tanimoto-like) against a query SMILES. " +
                "Returns ligands above a similarity cut-off, optionally filtered by physchem properties.",
            category: "ligands",
            queryParams: [
                { name: "smiles", type: "string", required: true, description: "Query SMILES string" },
                { name: "similarityGt", type: "number", required: false, description: "Lower similarity cut-off as a decimal (e.g. 0.8 for 80%); default 0.85" },
                { name: "logpGt", type: "number", required: false, description: "Lower LogP cut-off" },
                { name: "logpLt", type: "number", required: false, description: "Upper LogP cut-off" },
            ],
        },

        // ─── Interactions ───────────────────────────────────────────
        {
            method: "GET",
            path: "/interactions",
            summary:
                "List target-ligand interaction summaries. Heavy query surface for pharmacology: filter by targetType, action type, affinity parameter (+ threshold), species, approved flag, primary target, or by ligand structure (SMILES / InChIKey + similarity).",
            category: "interactions",
            queryParams: [
                { name: "type", type: "string", required: false, description: "Ligand action type", enum: ["Activator", "Agonist", "Allosteric modulator", "Antagonist", "Antibody", "Channel blocker", "Gating inhibitor", "Inhibitor", "Subunit-specific"] },
                { name: "affinityParameter", type: "string", required: false, description: "Affinity parameter to filter by (documented name)", enum: ["pA2", "pEC50", "pIC50", "pKB", "pKd", "pKi"] },
                { name: "affinityType", type: "string", required: false, description: "Alias of affinityParameter used in upstream examples", enum: ["pA2", "pEC50", "pIC50", "pKB", "pKd", "pKi"] },
                { name: "affinity", type: "number", required: false, description: "Minimum affinity threshold, e.g. 7.5" },
                { name: "species", type: "string", required: false, description: "Species common name" },
                { name: "targetType", type: "string", required: false, description: "Target class", enum: ["GPCR", "NHR", "LGIC", "VGIC", "OtherIC", "Enzyme", "CatalyticReceptor", "Transporter", "OtherProtein"] },
                { name: "ligandType", type: "string", required: false, description: "Ligand class" },
                { name: "approved", type: "boolean", required: false, description: "Restrict to approved drugs only" },
                { name: "primaryTarget", type: "boolean", required: false, description: "Restrict to primary-target interactions only" },
                { name: "structureSearchType", type: "string", required: false, description: "Ligand structure search mode", enum: ["similarity", "substructure", "exact"] },
                { name: "smiles", type: "string", required: false, description: "Optional SMILES for structure-based filtering" },
                { name: "similarityGt", type: "number", required: false, description: "Similarity cut-off (decimal, default 0.85)" },
                { name: "inchikey", type: "string", required: false, description: "Full InChIKey or first 14 chars for backbone match" },
            ],
        },
        {
            method: "GET",
            path: "/interactions/{interactionId}",
            summary: "Fetch a single interaction record by GtoPdb interaction Id.",
            category: "interactions",
            pathParams: [
                { name: "interactionId", type: "number", required: true, description: "GtoPdb interaction Id" },
            ],
        },
        {
            method: "GET",
            path: "/targets/{targetId}/interactions",
            summary:
                "All ligand interactions for a given target. Ideal entry point for receptor pharmacology (e.g. agonists/antagonists of GPER with pKi >= 7).",
            category: "interactions",
            pathParams: [
                { name: "targetId", type: "number", required: true, description: "GtoPdb target Id" },
            ],
            queryParams: [
                { name: "type", type: "string", required: false, description: "Ligand action type", enum: ["Activator", "Agonist", "Allosteric modulator", "Antagonist", "Antibody", "Channel blocker", "Gating inhibitor", "Inhibitor", "Subunit-specific"] },
                { name: "affinityParameter", type: "string", required: false, description: "Affinity parameter", enum: ["pA2", "pEC50", "pIC50", "pKB", "pKd", "pKi"] },
                { name: "affinityType", type: "string", required: false, description: "Alias of affinityParameter", enum: ["pA2", "pEC50", "pIC50", "pKB", "pKd", "pKi"] },
                { name: "affinity", type: "number", required: false, description: "Minimum affinity threshold" },
                { name: "species", type: "string", required: false, description: "Species common name" },
                { name: "ligandType", type: "string", required: false, description: "Ligand class" },
                { name: "approved", type: "boolean", required: false, description: "Approved drugs only" },
                { name: "primaryTarget", type: "boolean", required: false, description: "Primary-target interactions only" },
            ],
        },
        {
            method: "GET",
            path: "/ligands/{ligandId}/interactions",
            summary: "All target interactions for a given ligand.",
            category: "interactions",
            pathParams: [
                { name: "ligandId", type: "number", required: true, description: "GtoPdb ligand Id" },
            ],
            queryParams: [
                { name: "type", type: "string", required: false, description: "Interaction action type" },
                { name: "targetType", type: "string", required: false, description: "Target class filter" },
                { name: "species", type: "string", required: false, description: "Species common name" },
                { name: "affinityParameter", type: "string", required: false, description: "Affinity parameter" },
                { name: "affinity", type: "number", required: false, description: "Minimum affinity threshold" },
                { name: "primaryTarget", type: "boolean", required: false, description: "Primary-target interactions only" },
                { name: "asTarget", type: "boolean", required: false, description: "Include interactions where this ligand Id is the target (e.g. antibodies); default true" },
                { name: "asLigand", type: "boolean", required: false, description: "Include interactions where this ligand Id is the ligand; default true" },
            ],
        },

        // ─── Families ───────────────────────────────────────────────
        {
            method: "GET",
            path: "/targets/families",
            summary: "List target families (IUPHAR nomenclature hierarchy). Filter by type and name.",
            category: "families",
            queryParams: [
                { name: "type", type: "string", required: false, description: "Target class abbreviation" },
                { name: "name", type: "string", required: false, description: "Search families by name" },
            ],
        },
        {
            method: "GET",
            path: "/targets/families/{familyId}",
            summary: "Fetch a single target family record including its target members.",
            category: "families",
            pathParams: [
                { name: "familyId", type: "number", required: true, description: "GtoPdb family Id" },
            ],
        },
        {
            method: "GET",
            path: "/ligands/families",
            summary: "List ligand families/groups.",
            category: "families",
            queryParams: [
                { name: "name", type: "string", required: false, description: "Search ligand families by name" },
            ],
        },

        // ─── Diseases ───────────────────────────────────────────────
        {
            method: "GET",
            path: "/diseases",
            summary:
                "List diseases. Filter by name, synonym, or external accession+database " +
                "(OMIM, DOID, Orphanet, MeSH, etc.; default database is OMIM).",
            category: "diseases",
            queryParams: [
                { name: "name", type: "string", required: false, description: "Search diseases by name" },
                { name: "synonym", type: "string", required: false, description: "Search specifically within synonyms" },
                { name: "database", type: "string", required: false, description: "External database name (default: OMIM)" },
                { name: "accession", type: "string", required: false, description: "External accession (use with database)" },
            ],
        },
        {
            method: "GET",
            path: "/diseases/{diseaseId}",
            summary: "Fetch a single disease record by GtoPdb disease Id.",
            category: "diseases",
            pathParams: [
                { name: "diseaseId", type: "number", required: true, description: "GtoPdb disease Id" },
            ],
        },
        {
            method: "GET",
            path: "/diseases/{diseaseId}/diseaseTargets",
            summary: "Targets curated as associated with a given disease.",
            category: "diseases",
            pathParams: [
                { name: "diseaseId", type: "number", required: true, description: "GtoPdb disease Id" },
            ],
        },
        {
            method: "GET",
            path: "/diseases/{diseaseId}/diseaseLigands",
            summary: "Ligands curated as associated with a given disease (optionally approved-only).",
            category: "diseases",
            pathParams: [
                { name: "diseaseId", type: "number", required: true, description: "GtoPdb disease Id" },
            ],
            queryParams: [
                { name: "approved", type: "boolean", required: false, description: "Restrict to approved ligands only" },
            ],
        },

        // ─── Databases (via per-ligand database links) ──────────────
        {
            method: "GET",
            path: "/ligands/{ligandId}/databaseLinks",
            summary:
                "External database cross-references for a ligand (ChEMBL, PubChem CID, DrugBank, ChEBI, " +
                "KEGG, IUPHAR PDB ligand codes, etc.). Use this in place of a non-existent root /databases endpoint.",
            category: "databases",
            pathParams: [
                { name: "ligandId", type: "number", required: true, description: "GtoPdb ligand Id" },
            ],
            queryParams: [
                { name: "species", type: "string", required: false, description: "Species common name" },
                { name: "database", type: "string", required: false, description: "Restrict to one external database" },
            ],
        },
    ],
};
