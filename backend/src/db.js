import pg from 'pg';
const { Pool } = pg;
export const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined });
export async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
      password_reset_token_hash TEXT, password_reset_expires TIMESTAMPTZ,
      role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin','engineer','operator')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS motors (
      id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, asset_id TEXT NOT NULL UNIQUE,
      location TEXT, rated_power DOUBLE PRECISION NOT NULL DEFAULT 15,
      source TEXT NOT NULL DEFAULT 'simulation', status TEXT NOT NULL DEFAULT 'healthy',
      health DOUBLE PRECISION NOT NULL DEFAULT 98, runtime_hours DOUBLE PRECISION NOT NULL DEFAULT 0,
      last_seen TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS readings (
      id BIGSERIAL PRIMARY KEY, motor_id BIGINT NOT NULL REFERENCES motors(id) ON DELETE CASCADE,
      vibration DOUBLE PRECISION NOT NULL, temperature DOUBLE PRECISION NOT NULL,
      current DOUBLE PRECISION NOT NULL, rpm DOUBLE PRECISION NOT NULL, health DOUBLE PRECISION,
      status TEXT, source TEXT NOT NULL DEFAULT 'hardware', recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS readings_motor_time_idx ON readings(motor_id, recorded_at DESC);
    CREATE TABLE IF NOT EXISTS alerts (
      id BIGSERIAL PRIMARY KEY, motor_id BIGINT REFERENCES motors(id) ON DELETE SET NULL,
      severity TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL,
      acknowledged BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS maintenance (
      id BIGSERIAL PRIMARY KEY, motor_id BIGINT REFERENCES motors(id) ON DELETE SET NULL,
      title TEXT NOT NULL, description TEXT, priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'open', due_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}
