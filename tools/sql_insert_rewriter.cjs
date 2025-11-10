#!/usr/bin/env node
/**
 * SQL INSERT Rewriter
 *
 * Purpose: Convert `INSERT INTO table VALUES (...),(...);` to
 *          `INSERT INTO table (col1, col2, ...) VALUES (...),(...);`
 *          using live DB schema (DESCRIBE table).
 *
 * Usage (PowerShell):
 *   node tools/sql_insert_rewriter.cjs -i input.sql -o output.sql -t employees,attendance,payroll
 *
 * Notes:
 * - Requires a working ./db module exporting a mysql2/promise pool or query function compatible with `db.query`.
 * - Only rewrites statements for tables specified via -t (comma-separated).
 * - Leaves other statements untouched.
 */

const fs = require('fs');
const path = require('path');
// Try both root db.js (legacy) and backend/db/index.js pool
let db;
try {
  db = require('../db');
} catch (e) {
  try {
    db = require('../backend/db');
  } catch (e2) {
    console.error('❌ Unable to load database module. Expected ../db or ../backend/db');
    process.exit(1);
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { input: null, output: null, tables: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if ((a === '-i' || a === '--input') && args[i + 1]) {
      opts.input = args[++i];
    } else if ((a === '-o' || a === '--output') && args[i + 1]) {
      opts.output = args[++i];
    } else if ((a === '-t' || a === '--tables') && args[i + 1]) {
      opts.tables = args[++i].split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  if (!opts.input || !opts.output || !opts.tables.length) {
    console.error('Usage: node tools/sql_insert_rewriter.cjs -i input.sql -o output.sql -t table1,table2');
    process.exit(1);
  }
  return opts;
}

async function getTableColumns(table) {
  const [rows] = await db.query(`DESCRIBE ${table}`);
  return rows.map(r => r.Field);
}

function splitStatements(sql) {
  // Simple splitter: split on semicolons not inside quotes
  const parts = [];
  let buf = '';
  let inSingle = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'" && sql[i - 1] !== '\\') inSingle = !inSingle;
    if (ch === ';' && !inSingle) {
      const trimmed = buf.trim();
      if (trimmed) parts.push(trimmed);
      buf = '';
    } else {
      buf += ch;
    }
  }
  const tail = buf.trim();
  if (tail) parts.push(tail);
  return parts;
}

async function rewriteFile(inputPath, outputPath, tables) {
  const raw = fs.readFileSync(inputPath, 'utf8');
  const stmts = splitStatements(raw);

  const tableColsCache = new Map();
  for (const t of tables) {
    tableColsCache.set(t, await getTableColumns(t));
  }

  const rewritten = stmts.map(stmt => {
    // Match INSERT INTO table VALUES (...) form
    const m = stmt.match(/^INSERT\s+INTO\s+(\w+)\s+VALUES\s*\(/i);
    if (!m) return stmt; // leave untouched
    const table = m[1];
    if (!tables.includes(table)) return stmt; // only rewrite targeted tables

    const cols = tableColsCache.get(table);
    if (!cols || !cols.length) return stmt;

    // Insert column list after table name: INSERT INTO table (col1,col2,...)
    const withCols = stmt.replace(
      /^INSERT\s+INTO\s+(\w+)\s+VALUES\s*\(/i,
      (_, tbl) => `INSERT INTO ${tbl} (${cols.join(', ')}) VALUES (`
    );
    return withCols;
  });

  const finalText = rewritten.map(s => s + ';\n').join('');
  fs.writeFileSync(outputPath, finalText, 'utf8');
}

(async function main() {
  try {
    const opts = parseArgs();
    console.log('🔧 Rewriting SQL INSERT statements...');
    console.log(`   Input : ${path.resolve(opts.input)}`);
    console.log(`   Output: ${path.resolve(opts.output)}`);
    console.log(`   Tables: ${opts.tables.join(', ')}`);
    await rewriteFile(opts.input, opts.output, opts.tables);
    console.log('✅ Done. You can now import the rewritten SQL.');
  } catch (err) {
    console.error('❌ Failed to rewrite:', err.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
})();
