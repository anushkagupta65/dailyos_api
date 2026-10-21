import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from './env';

let activePool = new Pool({
  connectionString: env.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: env.nodeEnv === 'production' && !env.databaseUrl.includes('localhost')
    ? { rejectUnauthorized: false }
    : undefined,
});

activePool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

export const setTestPool = (testPool: Pool) => {
  activePool = testPool;
};

export const getPool = (): Pool => activePool;

export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const val = (activePool as any)[prop];
    return typeof val === 'function' ? val.bind(activePool) : val;
  },
});

export const query = async <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (env.nodeEnv === 'development' && duration > 500) {
    console.warn(`Slow query executed in ${duration}ms: ${text}`);
  }
  return res;
};

export const withTransaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
