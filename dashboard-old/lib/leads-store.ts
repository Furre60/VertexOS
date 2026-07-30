import { db } from "./db";
import { isLeadStatus, type LeadStatus } from "./types";

/**
 * CRM record for a single lead, keyed by the same `slug` used in
 * scored.json. Kept separate from lib/data.ts (which only ever reads the
 * scoring pipeline's JSON) so the two data sources stay independently
 * swappable.
 */
export interface LeadRecord {
  slug: string;
  favorite: boolean;
  status: LeadStatus;
  notes: string;
  lastContacted: string | null;
}

export interface LeadUpdateInput {
  favorite?: boolean;
  status?: LeadStatus;
  notes?: string;
  lastContacted?: string | null;
}

function defaultRecord(slug: string): LeadRecord {
  return { slug, favorite: false, status: "New", notes: "", lastContacted: null };
}

interface LeadRow {
  slug: string;
  favorite: number;
  status: string;
  notes: string;
  last_contacted: string | null;
}

function rowToRecord(row: LeadRow): LeadRecord {
  return {
    slug: row.slug,
    favorite: !!row.favorite,
    status: isLeadStatus(row.status) ? row.status : "New",
    notes: row.notes ?? "",
    lastContacted: row.last_contacted ?? null,
  };
}

const selectStmt = db.prepare("SELECT * FROM leads WHERE slug = ?");
const selectAllStmt = db.prepare("SELECT * FROM leads");
const deleteStmt = db.prepare("DELETE FROM leads WHERE slug = ?");
const upsertStmt = db.prepare(`
  INSERT INTO leads (slug, favorite, status, notes, last_contacted, updated_at)
  VALUES (@slug, @favorite, @status, @notes, @lastContacted, datetime('now'))
  ON CONFLICT(slug) DO UPDATE SET
    favorite = excluded.favorite,
    status = excluded.status,
    notes = excluded.notes,
    last_contacted = excluded.last_contacted,
    updated_at = excluded.updated_at
`);

/** Read a single lead's CRM record, defaulting to a fresh "New" record if
 *  nothing has been saved for this slug yet (no row is created on read). */
export function getLead(slug: string): LeadRecord {
  const row = selectStmt.get(slug) as LeadRow | undefined;
  return row ? rowToRecord(row) : defaultRecord(slug);
}

/** Read every stored CRM record, keyed by slug, for bulk-merging against
 *  the scored-leads list. */
export function getAllLeads(): Record<string, LeadRecord> {
  const rows = selectAllStmt.all() as LeadRow[];
  const map: Record<string, LeadRecord> = {};
  for (const row of rows) {
    const record = rowToRecord(row);
    map[record.slug] = record;
  }
  return map;
}

/** Create-or-update (upsert) a lead's CRM fields. Only the fields present
 *  in `updates` are changed; everything else keeps its current value. */
export function upsertLead(slug: string, updates: LeadUpdateInput): LeadRecord {
  const current = getLead(slug);

  const next: LeadRecord = {
    slug,
    favorite: updates.favorite ?? current.favorite,
    status: updates.status ?? current.status,
    notes: updates.notes ?? current.notes,
    lastContacted: updates.lastContacted !== undefined ? updates.lastContacted : current.lastContacted,
  };

  upsertStmt.run({
    slug: next.slug,
    favorite: next.favorite ? 1 : 0,
    status: next.status,
    notes: next.notes,
    lastContacted: next.lastContacted,
  });

  return next;
}

/** Reset a lead back to defaults by removing its CRM row entirely. */
export function deleteLead(slug: string): LeadRecord {
  deleteStmt.run(slug);
  return defaultRecord(slug);
}
