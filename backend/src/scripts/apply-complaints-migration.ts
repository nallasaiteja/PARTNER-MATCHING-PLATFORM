import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const prisma = new PrismaClient();
  try {
    const sqlPath = path.resolve(__dirname, '../../../supabase/migrations/20261015000007_section11_complaints.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split on semicolon
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement);
    }
    console.log('✅ Complaints RLS migration applied successfully!');
  } catch (err) {
    console.error('❌ Failed to apply complaints migration:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
