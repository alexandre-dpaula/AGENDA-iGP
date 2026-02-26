const { randomUUID } = require("crypto");
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

function mapEvent(row) {
  return {
    id: row.id,
    title: row.title,
    date: row.event_date,
    time: row.event_time ? String(row.event_time).slice(0, 5) : "",
    location: row.location,
    priority: row.priority,
    attendees: Array.isArray(row.attendees) ? row.attendees : [],
    order: row.order_index,
  };
}

module.exports = async function handler(req, res) {
  try {
    await ensureTable();

    if (req.method === "GET") {
      const rows = await sql`
        SELECT id, title, event_date, event_time, location, priority, attendees, order_index
        FROM events
        ORDER BY order_index ASC, event_date ASC, event_time ASC;
      `;
      res.status(200).json(rows.map(mapEvent));
      return;
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    if (req.method === "POST") {
      const attendees = Array.isArray(body.attendees) ? body.attendees : [];
      const id = body.id || randomUUID();
      const maxRows = await sql`
        SELECT COALESCE(MAX(order_index), 0) AS max
        FROM events;
      `;
      const nextOrder = Number(maxRows[0]?.max || 0) + 1;
      const order = Number.isFinite(body.order) ? body.order : nextOrder;

      const rows = await sql`
        INSERT INTO events (id, title, event_date, event_time, location, priority, attendees, order_index)
        VALUES (${id}, ${body.title}, ${body.date}, ${body.time}, ${body.location}, ${body.priority}, ${JSON.stringify(
        attendees
      )}::jsonb, ${order})
        RETURNING id, title, event_date, event_time, location, priority, attendees, order_index;
      `;
      res.status(201).json(mapEvent(rows[0]));
      return;
    }

    if (req.method === "PUT") {
      const attendees = Array.isArray(body.attendees) ? body.attendees : [];
      const rows = await sql`
        UPDATE events
        SET title = ${body.title},
            event_date = ${body.date},
            event_time = ${body.time},
            location = ${body.location},
            priority = ${body.priority},
            attendees = ${JSON.stringify(attendees)}::jsonb,
            order_index = COALESCE(${body.order}, order_index),
            updated_at = NOW()
        WHERE id = ${body.id}
        RETURNING id, title, event_date, event_time, location, priority, attendees, order_index;
      `;
      res.status(200).json(mapEvent(rows[0]));
      return;
    }

    if (req.method === "DELETE") {
      const id = req.query?.id;
      if (!id) {
        res.status(400).json({ error: "Missing id" });
        return;
      }
      await sql`DELETE FROM events WHERE id = ${id};`;
      res.status(200).json({ ok: true });
      return;
    }

    res.setHeader("Allow", "GET,POST,PUT,DELETE");
    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    res.status(500).json({ error: error.message || "Server error" });
  }
};
