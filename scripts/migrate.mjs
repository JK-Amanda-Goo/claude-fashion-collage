import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    user_email TEXT NOT NULL,
    event_type TEXT NOT NULL,
    canvas_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS events_user_email_idx ON events(user_email)`;
await sql`CREATE INDEX IF NOT EXISTS events_event_type_idx ON events(event_type)`;
await sql`CREATE INDEX IF NOT EXISTS events_created_at_idx ON events(created_at)`;

console.log("Migration complete: events table ready.");
