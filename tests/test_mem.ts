import { newDb, DataType } from 'pg-mem';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const testPgMem = async () => {
  const db = newDb();

  // Register pgcrypto / gen_random_uuid
  db.registerExtension('pgcrypto', (schema) => {
    schema.registerFunction({
      name: 'gen_random_uuid',
      returns: DataType.uuid,
      implementation: () => crypto.randomUUID(),
    });
  });

  // Register gen_random_uuid directly in public
  db.public.registerFunction({
    name: 'gen_random_uuid',
    returns: DataType.uuid,
    implementation: () => crypto.randomUUID(),
  });

  // Map INET to text if needed
  try {
    db.createType('inet', DataType.text);
  } catch (e) {
    // ignore if already defined
  }

  const sqlPath = path.join(__dirname, '../src/database/migrations/001_create_auth_and_user_tables.sql');
  let sql = fs.readFileSync(sqlPath, 'utf-8');
  sql = sql.replace(/DECIMAL\(\d+,\s*\d+\)/gi, 'DECIMAL');

  console.log('Testing migration execution with pg-mem...');
  db.public.none(sql);
  console.log('Migration executed successfully in pg-mem!');
};

testPgMem().catch(console.error);
