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
    CREATE TABLE IF NOT EXISTS leaders (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      phone_e164 TEXT NOT NULL,
      ministries JSONB NOT NULL DEFAULT '[]'::jsonb,
      opt_in BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
}

function parseMinistries(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  return [];
}

function mapLeader(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone_e164,
    ministries: parseMinistries(row.ministries),
    optIn: !!row.opt_in,
  };
}

module.exports = async function handler(req, res) {
  try {
    await ensureTable();

    if (req.method === "GET") {
      const rows = await sql`
        SELECT id, name, phone_e164, ministries, opt_in
        FROM leaders
        ORDER BY name ASC;
      `;
      res.status(200).json(rows.map(mapLeader));
      return;
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    if (req.method === "POST") {
      const id = body.id || randomUUID();
      const ministries = Array.isArray(body.ministries) ? body.ministries : [];
      const { rows } = await sql`
        INSERT INTO leaders (id, name, phone_e164, ministries, opt_in)
        VALUES (${id}, ${body.name}, ${body.phone}, ${JSON.stringify(ministries)}::jsonb, ${
        !!body.optIn
      })
        RETURNING id, name, phone_e164, ministries, opt_in;
      `;
      res.status(201).json(mapLeader(rows[0]));
      return;
    }

    if (req.method === "PUT") {
      const ministries = Array.isArray(body.ministries) ? body.ministries : [];
      const optIn = typeof body.optIn === "boolean" ? body.optIn : null;
      const name = body.name ?? "";
      const phone = body.phone ?? "";
      const rows = await sql`
        UPDATE leaders
        SET name = ${name},
            phone_e164 = ${phone},
            ministries = ${JSON.stringify(ministries)}::jsonb,
            opt_in = COALESCE(${optIn}, opt_in),
            updated_at = NOW()
        WHERE id = ${body.id}
        RETURNING id, name, phone_e164, ministries, opt_in;
      `;
      res.status(200).json(mapLeader(rows[0]));
      return;
    }

    if (req.method === "DELETE") {
      const id = req.query?.id;
      if (!id) {
        res.status(400).json({ error: "Missing id" });
        return;
      }
      await sql`DELETE FROM leaders WHERE id = ${id};`;
      res.status(200).json({ ok: true });
      return;
    }

    res.setHeader("Allow", "GET,POST,PUT,DELETE");
    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    res.status(500).json({ error: error.message || "Server error" });
  }
};
