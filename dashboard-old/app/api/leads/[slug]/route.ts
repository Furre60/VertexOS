import { NextRequest, NextResponse } from "next/server";
import { getBusinessBySlug } from "@/lib/data";
import { deleteLead, getLead, upsertLead, type LeadUpdateInput } from "@/lib/leads-store";
import { LEAD_STATUSES, isLeadStatus, type LeadStatus } from "@/lib/types";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/** GET /api/leads/[slug] — a single lead's CRM record (favorite/status/
 *  notes/lastContacted). 404s if the slug doesn't match a scored business. */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;

  const business = await getBusinessBySlug(slug);
  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  return NextResponse.json(getLead(slug));
}

/** PATCH /api/leads/[slug] — partial update (upsert) of a lead's CRM
 *  fields. Any subset of { favorite, status, notes, lastContacted } may
 *  be sent; omitted fields keep their current value. Creates the CRM
 *  record on first write. */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;

  const business = await getBusinessBySlug(slug);
  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const updates: LeadUpdateInput = {};

  if ("favorite" in input) {
    if (typeof input.favorite !== "boolean") {
      return NextResponse.json({ error: "favorite must be a boolean" }, { status: 400 });
    }
    updates.favorite = input.favorite;
  }

  if ("status" in input) {
    if (!isLeadStatus(input.status)) {
      return NextResponse.json(
        { error: `status must be one of: ${LEAD_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }
    updates.status = input.status as LeadStatus;
  }

  if ("notes" in input) {
    if (typeof input.notes !== "string") {
      return NextResponse.json({ error: "notes must be a string" }, { status: 400 });
    }
    updates.notes = input.notes;
  }

  if ("lastContacted" in input) {
    if (input.lastContacted !== null && typeof input.lastContacted !== "string") {
      return NextResponse.json({ error: "lastContacted must be a string or null" }, { status: 400 });
    }
    updates.lastContacted = input.lastContacted;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "Body must include at least one of: favorite, status, notes, lastContacted" },
      { status: 400 }
    );
  }

  const record = upsertLead(slug, updates);
  return NextResponse.json(record);
}

/** DELETE /api/leads/[slug] — resets a lead's CRM record back to
 *  defaults (favorite: false, status: New, notes: "", lastContacted: null). */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;

  const business = await getBusinessBySlug(slug);
  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const record = deleteLead(slug);
  return NextResponse.json(record);
}
