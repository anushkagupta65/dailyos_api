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
  db.public.none(`
    CREATE TABLE test_tab (id text, dt date, val text);
    INSERT INTO test_tab VALUES ('u1', '2026-10-22', 'a');
  `);

  try {
    const res = db.public.many(`
      INSERT INTO test_tab (id, dt, val)
      SELECT 'u1', '2026-10-22'::date, 'b'
      WHERE (SELECT count(*) FROM test_tab WHERE id = 'u1' AND dt = '2026-10-22'::date) < 3
      RETURNING *;
    `);
    console.log('Query 1 success:', res);
  } catch (e: any) {
    console.log('Query 1 failed:', e.message);
  }

  try {
    const res = db.public.many(`
      INSERT INTO test_tab (id, dt, val)
      SELECT 'u1', '2026-10-22'::date, 'b'
      WHERE (SELECT count(*) < 3 FROM test_tab WHERE id = 'u1' AND dt = '2026-10-22'::date)
      RETURNING *;
    `);
    console.log('Query 2 success:', res);
  } catch (e: any) {
    console.log('Query 2 failed:', e.message);
  }

  try {
    const res = db.public.many(`
      INSERT INTO test_tab (id, dt, val)
      SELECT 'u1', '2026-10-22'::date, 'c'
      WHERE NOT EXISTS (SELECT 1 FROM test_tab WHERE id = 'u1' AND dt = '2026-10-22'::date OFFSET 2)
      RETURNING *;
    `);
    console.log('Query 3 success:', res);
  } catch (e: any) {
    console.log('Query 3 failed:', e.message);
  }
};

testPgMem().catch(console.error);
