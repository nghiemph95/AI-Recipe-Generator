import 'dotenv/config';
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Client } = pg;

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const next = sql[i + 1];
    const twoChars = char + (next || '');

    if (inDollarQuote) {
      current += char;
      if (twoChars === '$$') {
        inDollarQuote = false;
        current += next || '';
        i += next ? 1 : 0;
      }
      continue;
    }

    if (twoChars === '$$') {
      inDollarQuote = true;
      current += char + (next || '');
      i += next ? 1 : 0;
      continue;
    }

    if (char === ';' && !inDollarQuote) {
      const stmt = current.trim();
      const hasSql = stmt && !stmt.split('\n').every((line) => !line.trim() || line.trim().startsWith('--'));
      if (hasSql) {
        statements.push(stmt + ';');
      }
      current = '';
      continue;
    }

    current += char;
  }

  const last = current.trim();
  const lastHasSql = last && !last.split('\n').every((line) => !line.trim() || line.trim().startsWith('--'));
  if (lastHasSql) {
    statements.push(last.endsWith(';') ? last : last + ';');
  }

  return statements;
}

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Error: DATABASE_URL is not set in .env');
    process.exit(1);
  }

  const schemaPath = join(__dirname, '../config/schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  const statements = splitSqlStatements(schema);

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to Neon Postgres\n');

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.slice(0, 70).replace(/\s+/g, ' ').trim() + (stmt.length > 70 ? '...' : '');
      try {
        await client.query(stmt);
        console.log(`✓ [${i + 1}/${statements.length}] ${preview}`);
      } catch (err) {
        if (err.code === '42P07' || err.code === '42710') {
          console.log(`⊘ [${i + 1}/${statements.length}] Already exists (skipped)`);
        } else {
          console.error(`\nFailed statement [${i + 1}]:`, preview);
          console.error('Error:', err.message);
          throw err;
        }
      }
    }

    console.log('\n✓ Migration completed successfully');
  } catch (err) {
    console.error('\n✗ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
