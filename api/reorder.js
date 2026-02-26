const postgres = require("postgres");

const databaseUrl = process.env.POSTGRES_URL;
const sql = databaseUrl
  ? postgres(databaseUrl, {
      max: 1,
      prepare: false,
      ssl: { rejectUnauthorized: false },
    })
  : null;

async function ensureTable() {
  if (!sql) throw new Error("POSTGRES_URL is not configured");
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id UUID PRIMARY KEY,
      title TEXT NOT NULL,
      event_date DATE NOT NULL,
      event_time TIME NOT NULL,
      location TEXT NOT NULL,
      priority TEXT NOT NULL,
      attendees JSONB NOT NULL DEFAULT '[]'::jsonb,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
}

module.exports = async function handler(req, res) {
  try {
    await ensureTable();

    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const updates = Array.isArray(body.updates) ? body.updates : [];

    if (!updates.length) {
      res.status(400).json({ error: "No updates provided" });
      return;
    }

    await sql`BEGIN`;
    for (const update of updates) {
      await sql`
        UPDATE events
        SET order_index = ${update.order},
            updated_at = NOW()
        WHERE id = ${update.id};
      `;
    }
    await sql`COMMIT`;

    res.status(200).json({ ok: true });
  } catch (error) {
    try {
      await sql`ROLLBACK`;
    } catch (_) {
      // ignore rollback errors
    }
    res.status(500).json({ error: error.message || "Server error" });
  }
};
