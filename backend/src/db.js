import pg from 'pg';

/**
 * Postgres katmanı.
 *  - Üretim/yerel: DATABASE_URL (Neon vb.) ile `pg` Pool.
 *  - Test (NODE_ENV=test ve DATABASE_URL yok): süreç içi PGlite (gerçek Postgres motoru).
 *
 * Serverless'ta birden çok fonksiyon örneği aynı anda çalışabilir; yerleştirme işlemleri
 * transaction başında advisory lock alarak SQLite'taki "tek yazar" garantisini korur.
 */

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS participants (
    seq BIGSERIAL,
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    answers JSONB NOT NULL,
    feature_vector JSONB NOT NULL,
    table_number INTEGER,
    device_id TEXT UNIQUE,
    status TEXT NOT NULL,
    waitlist_position INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
  )
`;

const LOCK_ID = 727001;

function normalizeDatabaseUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const sslmode = parsed.searchParams.get('sslmode');
    if (sslmode === 'require' || sslmode === 'prefer' || sslmode === 'verify-ca') {
      parsed.searchParams.set('sslmode', 'verify-full');
      return parsed.toString();
    }
    return rawUrl;
  } catch {
    return rawUrl.replace(/([?&])sslmode=(?:require|prefer|verify-ca)(&|$)/, '$1sslmode=verify-full$2');
  }
}

async function createPgImpl() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) throw new Error('DATABASE_URL tanımlı değil');
  const url = normalizeDatabaseUrl(rawUrl);
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  return {
    query: (text, params) => pool.query(text, params),
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock($1)', [LOCK_ID]);
        const result = await fn((text, params) => client.query(text, params));
        await client.query('COMMIT');
        return result;
      } catch (err) {
        try { await client.query('ROLLBACK'); } catch { /* yoksay */ }
        throw err;
      } finally {
        client.release();
      }
    },
  };
}

async function createPgliteImpl() {
  const { PGlite } = await import('@electric-sql/pglite');
  const lite = new PGlite();
  return {
    query: (text, params) => lite.query(text, params),
    transaction: (fn) => lite.transaction((tx) => fn((text, params) => tx.query(text, params))),
  };
}

let initPromise;

function init() {
  if (!initPromise) {
    initPromise = (async () => {
      const useLite = process.env.NODE_ENV === 'test' && !process.env.DATABASE_URL;
      const impl = useLite ? await createPgliteImpl() : await createPgImpl();
      await impl.query(SCHEMA);
      return impl;
    })();
    // Başarısız başlatma sonraki istekte tekrar denensin
    initPromise.catch(() => { initPromise = undefined; });
  }
  return initPromise;
}

/** Tek sorgu: await query('SELECT ... WHERE id = $1', [id]) → { rows } */
export async function query(text, params) {
  const impl = await init();
  return impl.query(text, params);
}

/** fn(q) transaction içinde çalışır; hata olursa ROLLBACK. */
export async function withTransaction(fn) {
  const impl = await init();
  return impl.transaction(fn);
}
