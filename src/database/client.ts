/**
 * Nexus Compliance Engine - Database Client
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('database');

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.user,
      password: config.database.password,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
      min: config.database.pool.min,
      max: config.database.pool.max,
      idleTimeoutMillis: config.database.pool.idleTimeoutMillis,
    });

    pool.on('error', (err) => {
      logger.error({ err }, 'Unexpected database pool error');
    });

    pool.on('connect', () => {
      logger.debug('New database connection established');
    });
  }

  return pool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const pool = getPool();

  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    logger.debug({
      query: text.substring(0, 100),
      params: params?.length,
      rows: result.rowCount,
      duration,
    }, 'Query executed');

    return result;
  } catch (error) {
    logger.error({ err: error, query: text.substring(0, 100) }, 'Query failed');
    throw error;
  }
}

export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  const client = await pool.connect();
  return client;
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();

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
}

export async function withTenantContext<T>(
  tenantId: string,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  return transaction(async (client) => {
    await client.query("SET LOCAL app.current_tenant_id = $1", [tenantId]);
    return callback(client);
  });
}

export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT 1 as health');
    return result.rowCount === 1;
  } catch {
    return false;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database pool closed');
  }
}

export interface DatabaseRow {
  [key: string]: unknown;
}

export function snakeToCamel<T>(obj: DatabaseRow): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result as T;
}

export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function buildInsertQuery(
  table: string,
  data: Record<string, unknown>,
  returning: string[] = ['*']
): { text: string; values: unknown[] } {
  const columns: string[] = [];
  const placeholders: string[] = [];
  const values: unknown[] = [];

  let i = 1;
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      columns.push(camelToSnake(key));
      placeholders.push(`$${i}`);
      values.push(value);
      i++;
    }
  }

  const text = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES (${placeholders.join(', ')})
    RETURNING ${returning.join(', ')}
  `;

  return { text, values };
}

export function buildUpdateQuery(
  table: string,
  data: Record<string, unknown>,
  where: Record<string, unknown>,
  returning: string[] = ['*']
): { text: string; values: unknown[] } {
  const setClauses: string[] = [];
  const whereClauses: string[] = [];
  const values: unknown[] = [];

  let i = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      setClauses.push(`${camelToSnake(key)} = $${i}`);
      values.push(value);
      i++;
    }
  }

  for (const [key, value] of Object.entries(where)) {
    whereClauses.push(`${camelToSnake(key)} = $${i}`);
    values.push(value);
    i++;
  }

  const text = `
    UPDATE ${table}
    SET ${setClauses.join(', ')}, updated_at = NOW()
    WHERE ${whereClauses.join(' AND ')}
    RETURNING ${returning.join(', ')}
  `;

  return { text, values };
}
