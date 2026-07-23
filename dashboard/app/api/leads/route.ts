import { NextResponse } from "next/server";
import { getBusinesses } from "@/lib/data";

/** GET /api/leads — every scored business merged with its CRM record
 *  (favorite / status / notes / lastContacted). Read-only collection
 *  endpoint; individual leads are created/updated via PATCH on
 *  /api/leads/[slug]. */
export async function GET() {
  try {
    const businesses = await getBusinesses();
    return NextResponse.json(businesses);
  } catch {
    return NextResponse.json({ error: "Could not read scored leads." }, { status: 500 });
  }
}
