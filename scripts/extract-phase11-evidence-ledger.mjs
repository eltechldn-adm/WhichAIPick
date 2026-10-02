import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

const WORKBOOK_PATH = process.argv[2] ? path.resolve(process.argv[2]) : process.env.WORKBOOK_PATH ? path.resolve(process.env.WORKBOOK_PATH) : null;
if (!WORKBOOK_PATH) {
  console.error("Please provide the path to the recovered workbook as a CLI argument.");
  process.exit(1);
}
const WORKBOOK_SHA256 = '8740b78d9ae04e00f71d75d22b6c47a5ca7c62ecf446e4a67cbaa19c7e78e0d8';
const CATALOG_STAGED_PATH = path.resolve('data/tools.phase11.staged.json');
const OUT_DIR = path.resolve('data/evidence');
const OUT_JSON = path.join(OUT_DIR, 'phase11-evidence-ledger.json');
const OUT_MANIFEST = path.join(OUT_DIR, 'phase11-evidence-ledger.manifest.json');

const EXPECTED_COLUMNS = ['evidenceId', 'id', 'fieldScope', 'sourceURL', 'reviewedAt', 'method', 'finding'];

function extract() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  console.log(`Reading workbook: ${WORKBOOK_PATH}`);
  const wb = XLSX.readFile(WORKBOOK_PATH);
  
  if (!wb.SheetNames.includes('Evidence Ledger')) {
    console.error("Missing 'Evidence Ledger' sheet.");
    process.exit(1);
  }

  const rawRows = XLSX.utils.sheet_to_json(wb.Sheets['Evidence Ledger'], { defval: null });
  
  // Validate columns on first row
  if (rawRows.length > 0) {
    const keys = Object.keys(rawRows[0]);
    EXPECTED_COLUMNS.forEach(col => {
      if (!keys.includes(col)) {
        console.error(`Missing expected column: ${col}`);
        process.exit(1);
      }
    });
  }

  // Sort deterministically by evidenceId
  rawRows.sort((a, b) => {
    if (a.evidenceId < b.evidenceId) return -1;
    if (a.evidenceId > b.evidenceId) return 1;
    return 0;
  });

  // Calculate manifest stats
  const uniqueLedgerIds = new Set(rawRows.map(r => r.evidenceId));
  
  const staged = JSON.parse(fs.readFileSync(CATALOG_STAGED_PATH, 'utf8'));
  const phase11ReferencedIds = new Set();
  staged.forEach(t => {
    (t.evidenceIds || []).forEach(eid => phase11ReferencedIds.add(eid));
  });

  let resolved = 0;
  let missing = 0;
  let extra = 0;

  phase11ReferencedIds.forEach(id => {
    if (uniqueLedgerIds.has(id)) resolved++;
    else missing++;
  });

  uniqueLedgerIds.forEach(id => {
    if (!phase11ReferencedIds.has(id)) extra++;
  });

  // Emit JSON
  fs.writeFileSync(OUT_JSON, JSON.stringify(rawRows, null, 2));
  console.log(`Wrote ${rawRows.length} ledger records to ${OUT_JSON}`);

  // Emit Manifest
  const manifest = {
    sourceWorkbook: path.basename(WORKBOOK_PATH),
    sourceWorkbookSha256: WORKBOOK_SHA256,
    sourceSheet: "Evidence Ledger",
    ledgerRows: rawRows.length,
    uniqueEvidenceIds: uniqueLedgerIds.size,
    phase11ReferencedEvidenceIds: phase11ReferencedIds.size,
    resolvedEvidenceIds: resolved,
    missingEvidenceIds: missing,
    historicalExtraEvidenceIds: extra,
    catalogSchema: "catalog-2.0-rc4",
    recoveryDate: "2026-10-02"
  };

  fs.writeFileSync(OUT_MANIFEST, JSON.stringify(manifest, null, 2));
  console.log(`Wrote manifest to ${OUT_MANIFEST}`);
}

extract();
