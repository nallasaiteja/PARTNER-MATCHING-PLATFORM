import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const prisma = new PrismaClient();
  try {
    const migrationName = process.argv[2] || '20261015000006_section11_careers.sql';
    const sqlPath = path.join(__dirname, '../../../supabase/migrations', migrationName);
    if (!fs.existsSync(sqlPath)) {
      console.error('Migration file not found:', sqlPath);
      return;
    }
    const sql = fs.readFileSync(sqlPath, 'utf8');
    // Split on semicolon, ignoring comments
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      if (stmt.length > 0) {
        await prisma.$executeRawUnsafe(stmt);
      }
    }
    console.log('✅ Section 11.1 Success Stories RLS migration applied successfully.');
  } catch (err) {
    console.error('Error applying RLS migration:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
