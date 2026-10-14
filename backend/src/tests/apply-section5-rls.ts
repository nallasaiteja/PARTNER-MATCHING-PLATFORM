import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const sqlPath = path.join(__dirname, '../../../supabase/migrations/20261014000000_section5_rls.sql');
  const fullSql = fs.readFileSync(sqlPath, 'utf8');

  const statements: string[] = [];
  let current = '';
  let inDollarQuote = false;

  for (const line of fullSql.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--')) continue;

    if (line.includes('$$')) {
      inDollarQuote = !inDollarQuote;
    }

    current += line + '\n';

    if (!inDollarQuote && trimmed.endsWith(';')) {
      if (current.trim()) {
        statements.push(current.trim());
      }
      current = '';
    }
  }

  if (current.trim()) {
    statements.push(current.trim());
  }

  console.log(`Applying ${statements.length} Section 5 Supabase SQL statements...`);
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await prisma.$executeRawUnsafe(stmt);
      console.log(`[${i + 1}/${statements.length}] Done: ${stmt.slice(0, 50).replace(/\n/g, ' ')}...`);
    } catch (err: any) {
      console.error(`Error on statement ${i + 1}:`, stmt, err.message);
      throw err;
    }
  }

  console.log('✅ ALL Section 5 Supabase RLS policies applied successfully!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
