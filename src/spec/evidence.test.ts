import { expect, it } from "vitest";
import { gtopdbCatalog } from "./catalog";
import { evidenceRecipe } from "./evidence";
it("advertises the three local wrappers with native filter definitions", () => {
  const evidence = gtopdbCatalog.endpoints.filter(endpoint => endpoint.path.startsWith("/evidence/"));
  expect(evidence).toHaveLength(3); expect(gtopdbCatalog.endpointCount).toBe(gtopdbCatalog.endpoints.length);
  for (const endpoint of evidence) {
    const native = gtopdbCatalog.endpoints.find(item => item.path === endpoint.path.slice(9));
    expect(native).toBeDefined(); expect(endpoint.queryParams).toEqual(native?.queryParams);
  }
});
it("keeps all three packets, staged handles and repeated species evidence in the recipe", async () => {
  const paths: string[] = [];
  const packets = [{ data: { targetId: 54, HGNC: "001", RGD: "001", MGI: "001" } }, { __staged: true, data_access_id: "links" }, { data: [{ ligandId: 7, species: "Rat" }, { ligandId: 7, species: "Human" }] }];
  const run = new Function("api", `return (async()=>{${evidenceRecipe.code}})();`);
  const result = await run({ get: async (path: string) => { paths.push(path); return packets[paths.length - 1]; } });
  expect(paths).toEqual(["/evidence/targets/54", "/evidence/targets/54/databaseLinks", "/evidence/targets/54/interactions"]);
  expect(result).toEqual({ targetId: 54, detail: packets[0], databaseLinks: packets[1], interactions: packets[2], dataset_release: null, snapshot_pinned: false });
});
it.each([0, 1, 2])("stops and surfaces an API error at recipe step %i", async failed => {
  let calls = 0; const error = { __api_error: true, status: 401 };
  const run = new Function("api", `return (async()=>{${evidenceRecipe.code}})();`);
  expect(await run({ get: async () => calls++ === failed ? error : { data: [] } })).toEqual(error); expect(calls).toBe(failed + 1);
});
