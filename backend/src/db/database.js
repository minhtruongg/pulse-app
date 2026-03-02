const fs   = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
const DB_PATH  = path.join(DATA_DIR, 'pulse.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let SQL;
let db;

async function initDB() {
  if (db) return db;

  SQL = await require('sql.js')();

  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      name       TEXT NOT NULL,
      site       TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      name       TEXT NOT NULL,
      type       TEXT NOT NULL DEFAULT 'custom',
      props      TEXT,
      url        TEXT,
      referrer   TEXT,
      user_agent TEXT,
      ts         INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    CREATE INDEX IF NOT EXISTS idx_events_project ON events(project_id);
    CREATE INDEX IF NOT EXISTS idx_events_ts      ON events(ts);
  `);

  persist();
  return db;
}

function persist() {
  if (!db) return;
  try {
    fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  } catch (e) {
    console.error('DB persist error:', e.message);
  }
}

function run(sql, params = []) { db.run(sql, params); persist(); }

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) { const row = stmt.getAsObject(); stmt.free(); return row; }
  stmt.free();
  return null;
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// ── Projects ─────────────────────────────────────────────────
function createProject(id, userId, name, site) {
  run(`INSERT INTO projects (id, user_id, name, site) VALUES (?, ?, ?, ?)`, [id, userId, name, site]);
}

function getProject(id) {
  return get(`SELECT * FROM projects WHERE id = ?`, [id]);
}

function getProjectsByUser(userId) {
  return all(`SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
}

// ── Events ───────────────────────────────────────────────────
function insertEvent({ project_id, name, type, props, url, referrer, user_agent }) {
  run(
    `INSERT INTO events (project_id, name, type, props, url, referrer, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [project_id, name, type, props, url, referrer, user_agent]
  );
}

function getRecentEvents(projectId, since) {
  return all(`SELECT * FROM events WHERE project_id = ? AND ts >= ? ORDER BY ts DESC LIMIT 200`, [projectId, since]);
}

function getEventStats(projectId, since) {
  return get(
    `SELECT COUNT(*) AS total,
       SUM(CASE WHEN type='page'  THEN 1 ELSE 0 END) AS page_views,
       SUM(CASE WHEN type='click' THEN 1 ELSE 0 END) AS clicks,
       SUM(CASE WHEN type='focus' THEN 1 ELSE 0 END) AS focus_events,
       COUNT(DISTINCT name) AS unique_event_types
     FROM events WHERE project_id = ? AND ts >= ?`,
    [projectId, since]
  );
}

function getTopPages(projectId, since) {
  return all(
    `SELECT url, COUNT(*) AS count FROM events
     WHERE project_id = ? AND type = 'page' AND ts >= ? AND url IS NOT NULL
     GROUP BY url ORDER BY count DESC LIMIT 10`,
    [projectId, since]
  );
}

function getTopEvents(projectId, since) {
  return all(
    `SELECT name, type, COUNT(*) AS count FROM events
     WHERE project_id = ? AND ts >= ?
     GROUP BY name, type ORDER BY count DESC LIMIT 10`,
    [projectId, since]
  );
}

function getHourlyVolume(projectId, since) {
  return all(
    `SELECT strftime('%Y-%m-%d %H:00', ts, 'unixepoch') AS hour, COUNT(*) AS count
     FROM events WHERE project_id = ? AND ts >= ?
     GROUP BY hour ORDER BY hour ASC`,
    [projectId, since]
  );
}

module.exports = {
  initDB, createProject, getProject, getProjectsByUser,
  insertEvent, getRecentEvents, getEventStats,
  getTopPages, getTopEvents, getHourlyVolume,
};
