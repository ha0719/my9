#!/usr/bin/env node

import { neon } from "@neondatabase/serverless";
import { resolve } from "node:path";

const OLD_TREND_ALL_TABLE = "my9_trend_count_all_v1";
const OLD_TREND_DAY_TABLE = "my9_trend_count_day_v1";
const NEW_TREND_ALL_TABLE = "my9_trend_subject_all_v2";
const NEW_TREND_DAY_TABLE = "my9_trend_subject_day_v2";
const TRENDS_CACHE_TABLE = "my9_trends_cache_v1";

function loadLocalEnvFiles() {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(resolve(process.cwd(), file));
    } catch {
      // ignore missing env file
    }
  }
}

function readEnv(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function buildDatabaseUrlFromNeonParts() {
  const host = readEnv("NEON_DATABASE_PGHOST_UNPOOLED", "NEON_DATABASE_PGHOST");
  const user = readEnv("NEON_DATABASE_PGUSER");
  const password = readEnv("NEON_DATABASE_PGPASSWORD", "NEON_DATABASE_POSTGRES_PASSWORD");
  const database = readEnv("NEON_DATABASE_PGDATABASE", "NEON_DATABASE_POSTGRES_DATABASE");
  if (!host || !user || !password || !database) return null;

  let hostWithPort = host;
  const port = readEnv("NEON_DATABASE_PGPORT");
  if (port && !host.includes(":")) {
    hostWithPort = `${host}:${port}`;
  }

  const sslMode = readEnv("NEON_DATABASE_PGSSLMODE") ?? "require";
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(
    password
  )}@${hostWithPort}/${encodeURIComponent(database)}?sslmode=${encodeURIComponent(sslMode)}`;
}

async function tableExists(sql, tableName) {
  const rows = await sql.query("SELECT to_regclass($1) IS NOT NULL AS ok", [tableName]);
  return Boolean(rows[0]?.ok);
}

async function getRelationStats(sql, tableName) {
  const exists = await tableExists(sql, tableName);
  if (!exists) return null;

  const rows = await sql.query(
    `
    SELECT
      COUNT(*)::BIGINT AS row_count,
      pg_total_relation_size($1::regclass)::BIGINT AS total_bytes,
      pg_size_pretty(pg_total_relation_size($1::regclass)) AS total_pretty
    FROM ${tableName}
    `,
    [tableName]
  );
  return rows[0] ?? null;
}

async function getDatabaseSize(sql) {
  const rows = await sql.query(
    `
    SELECT
      pg_database_size(current_database())::BIGINT AS db_size_bytes,
      pg_size_pretty(pg_database_size(current_database())) AS db_size_pretty
    `
  );
  return rows[0] ?? null;
}

async function ensureNewTrendTables(sql) {
  await sql.query(
    `
    CREATE TABLE IF NOT EXISTS ${NEW_TREND_ALL_TABLE} (
      subject_id TEXT PRIMARY KEY,
      count BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )
    `
  );
  await sql.query(
    `
    CREATE TABLE IF NOT EXISTS ${NEW_TREND_DAY_TABLE} (
      day_key INT NOT NULL,
      subject_id TEXT NOT NULL,
      count BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      PRIMARY KEY (day_key, subject_id)
    )
    `
  );
}

function hasArg(name) {
  return process.argv.includes(`--${name}`);
}

async function main() {
  loadLocalEnvFiles();

  const databaseUrl = process.env.DATABASE_URL || buildDatabaseUrlFromNeonParts();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL / NEON_DATABASE_* is required");
  }

  const sql = neon(databaseUrl);
  const beforeDb = await getDatabaseSize(sql);
  const beforeStats = {
    old_all: await getRelationStats(sql, OLD_TREND_ALL_TABLE),
    old_day: await getRelationStats(sql, OLD_TREND_DAY_TABLE),
    new_all: await getRelationStats(sql, NEW_TREND_ALL_TABLE),
    new_day: await getRelationStats(sql, NEW_TREND_DAY_TABLE),
  };

  const oldAllExists = Boolean(beforeStats.old_all);
  const oldDayExists = Boolean(beforeStats.old_day);
  const reset = hasArg("reset");

  await ensureNewTrendTables(sql);

  let insertedAll = 0;
  let insertedDay = 0;

  if (reset) {
    await sql.query(`TRUNCATE TABLE ${NEW_TREND_ALL_TABLE}`);
    await sql.query(`TRUNCATE TABLE ${NEW_TREND_DAY_TABLE}`);
  }

  if (oldAllExists || oldDayExists) {
    if (oldAllExists) {
      const insertedRows = await sql.query(
        `
        INSERT INTO ${NEW_TREND_ALL_TABLE} (subject_id, count, updated_at)
        SELECT
          subject_id,
          SUM(count)::BIGINT AS count,
          MAX(updated_at)::BIGINT AS updated_at
        FROM ${OLD_TREND_ALL_TABLE}
        WHERE view = 'overall' AND bucket_key = 'overall'
        GROUP BY subject_id
        ON CONFLICT (subject_id) DO UPDATE SET
          count = ${NEW_TREND_ALL_TABLE}.count + EXCLUDED.count,
          updated_at = GREATEST(${NEW_TREND_ALL_TABLE}.updated_at, EXCLUDED.updated_at)
        RETURNING 1
        `
      );
      insertedAll = insertedRows.length;
    }

    if (oldDayExists) {
      const insertedRows = await sql.query(
        `
        INSERT INTO ${NEW_TREND_DAY_TABLE} (day_key, subject_id, count, updated_at)
        SELECT
          day_key,
          subject_id,
          SUM(count)::BIGINT AS count,
          MAX(updated_at)::BIGINT AS updated_at
        FROM ${OLD_TREND_DAY_TABLE}
        WHERE view = 'overall' AND bucket_key = 'overall'
        GROUP BY day_key, subject_id
        ON CONFLICT (day_key, subject_id) DO UPDATE SET
          count = ${NEW_TREND_DAY_TABLE}.count + EXCLUDED.count,
          updated_at = GREATEST(${NEW_TREND_DAY_TABLE}.updated_at, EXCLUDED.updated_at)
        RETURNING 1
        `
      );
      insertedDay = insertedRows.length;
    }
  }

  await sql.query(`TRUNCATE TABLE ${TRENDS_CACHE_TABLE}`);

  if (oldDayExists) {
    await sql.query(`DROP TABLE ${OLD_TREND_DAY_TABLE}`);
  }
  if (oldAllExists) {
    await sql.query(`DROP TABLE ${OLD_TREND_ALL_TABLE}`);
  }

  await sql.query(`ANALYZE ${NEW_TREND_ALL_TABLE}`);
  await sql.query(`ANALYZE ${NEW_TREND_DAY_TABLE}`);

  const afterDb = await getDatabaseSize(sql);
  const afterStats = {
    old_all: await getRelationStats(sql, OLD_TREND_ALL_TABLE),
    old_day: await getRelationStats(sql, OLD_TREND_DAY_TABLE),
    new_all: await getRelationStats(sql, NEW_TREND_ALL_TABLE),
    new_day: await getRelationStats(sql, NEW_TREND_DAY_TABLE),
  };

  console.log(
    JSON.stringify(
      {
        ok: true,
        reset,
        inserted_all_rows: insertedAll,
        inserted_day_rows: insertedDay,
        before_db: beforeDb,
        after_db: afterDb,
        before: beforeStats,
        after: afterStats,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
