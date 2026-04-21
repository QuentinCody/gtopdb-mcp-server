#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, '..');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assertContains(filePath, haystack, needle, testName) {
  totalTests++;
  if (haystack.includes(needle)) {
    console.log(`${GREEN}✓${RESET} ${testName}`);
    passedTests++;
  } else {
    console.log(`${RED}✗${RESET} ${testName}`);
    console.log(`  Missing: ${needle}`);
    console.log(`  File: ${filePath}`);
    failedTests++;
  }
}

function assertNotContains(filePath, haystack, needle, testName) {
  totalTests++;
  if (!haystack.includes(needle)) {
    console.log(`${GREEN}✓${RESET} ${testName}`);
    passedTests++;
  } else {
    console.log(`${RED}✗${RESET} ${testName}`);
    console.log(`  Unexpectedly found: ${needle}`);
    console.log(`  File: ${filePath}`);
    failedTests++;
  }
}

function readFile(relPath) {
  const absPath = path.resolve(SERVER_ROOT, relPath);
  return fs.readFileSync(absPath, 'utf8');
}

console.log(`${BLUE}🧪 GtoPdb Structured Content Regression Tests${RESET}`);

// Code Mode-only server — the four tools come from createSearchTool,
// createExecuteTool, createQueryDataHandler, and createGetSchemaHandler
// in @bio-mcp/shared, which already emit content + structuredContent.
// These assertions verify the wiring is correct.
const toolExpectations = [
  {
    path: 'src/tools/code-mode.ts',
    required: ['createSearchTool', 'createExecuteTool', 'gtopdb', 'gtopdbCatalog'],
  },
  {
    path: 'src/tools/query-data.ts',
    required: ['createQueryDataHandler', 'gtopdb_query_data'],
  },
  {
    path: 'src/tools/get-schema.ts',
    required: ['createGetSchemaHandler', 'gtopdb_get_schema'],
  },
];

for (const { path: filePath, required } of toolExpectations) {
  const content = readFile(filePath);
  for (const token of required) {
    assertContains(filePath, content, token, `${filePath} includes ${token}`);
  }
}

const indexContent = readFile('src/index.ts');
assertContains('src/index.ts', indexContent, 'GtopdbDataDO', 'index.ts exports GtopdbDataDO');
assertContains('src/index.ts', indexContent, 'McpAgent', 'index.ts uses McpAgent');
assertContains('src/index.ts', indexContent, 'registerCodeMode', 'index.ts wires registerCodeMode');
assertContains('src/index.ts', indexContent, 'registerQueryData', 'index.ts wires registerQueryData');
assertContains('src/index.ts', indexContent, 'registerGetSchema', 'index.ts wires registerGetSchema');
// Code Mode-only server must not import hand-built search / gene-lookup tools.
assertNotContains('src/index.ts', indexContent, 'registerSearch', 'index.ts does NOT wire a hand-built search tool');
assertNotContains('src/index.ts', indexContent, 'registerGeneLookup', 'index.ts does NOT wire hand-built gene lookup');

// Catalog sanity — must hit all six categories from §5.3 of the plan
const catalogContent = readFile('src/spec/catalog.ts');
for (const category of ['targets', 'ligands', 'interactions', 'families', 'diseases', 'databases']) {
  assertContains(
    'src/spec/catalog.ts',
    catalogContent,
    `category: "${category}"`,
    `catalog covers category "${category}"`,
  );
}
// Plan §5.3 positioning sentence (vs ChEMBL) must be present in catalog notes.
assertContains(
  'src/spec/catalog.ts',
  catalogContent,
  'Complements ChEMBL',
  'catalog notes include ChEMBL positioning sentence',
);
assertContains(
  'src/spec/catalog.ts',
  catalogContent,
  'receptor/ligand-centric',
  'catalog notes explain receptor/ligand-centric stance',
);

// api-adapter must call through to gtopdbFetch and honour the GtoPdb base URL.
const adapterContent = readFile('src/lib/api-adapter.ts');
assertContains('src/lib/api-adapter.ts', adapterContent, 'gtopdbFetch', 'api-adapter delegates to gtopdbFetch');
assertContains('src/lib/api-adapter.ts', adapterContent, 'createGtopdbApiFetch', 'api-adapter exports createGtopdbApiFetch');

const httpContent = readFile('src/lib/http.ts');
assertContains('src/lib/http.ts', httpContent, 'guidetopharmacology.org/services', 'http.ts points at the GtoPdb services base URL');
assertContains('src/lib/http.ts', httpContent, 'Accept', 'http.ts sets Accept header (JSON)');

// wrangler.jsonc must bind GTOPDB_DATA_DO and use port 8821
const wranglerContent = readFile('wrangler.jsonc');
assertContains('wrangler.jsonc', wranglerContent, 'GTOPDB_DATA_DO', 'wrangler.jsonc binds GTOPDB_DATA_DO');
assertContains('wrangler.jsonc', wranglerContent, 'GtopdbDataDO', 'wrangler.jsonc migrates GtopdbDataDO class');
assertContains('wrangler.jsonc', wranglerContent, '"port": 8821', 'wrangler.jsonc dev port is 8821');
assertContains('wrangler.jsonc', wranglerContent, 'CODE_MODE_LOADER', 'wrangler.jsonc binds CODE_MODE_LOADER');

console.log(`\n${BLUE}📊 Test Results Summary${RESET}`);
console.log(`Total tests: ${totalTests}`);
console.log(`${GREEN}Passed: ${passedTests}${RESET}`);
console.log(`${RED}Failed: ${failedTests}${RESET}`);

if (failedTests > 0) {
  console.log(`\n${RED}❌ Regression tests failed.${RESET}`);
  process.exit(1);
}

console.log(`\n${GREEN}✅ GtoPdb structured content regression tests passed.${RESET}`);
