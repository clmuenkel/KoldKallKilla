export const dynamic = 'force-dynamic';
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  
  const contactId = searchParams.get("contactId");
  const companyId = searchParams.get("companyId");
  const status = searchParams.get("status");
  const upcoming = searchParams.get("upcoming");
  const limit = searchParams.get("limit");

  let query = supabase
    .from("meetings")
    .select("*, contacts(id, first_name, last_name, company_name, title)")
    .order("scheduled_at", { ascending: true });

  if (contactId) {
    query = query.eq("contact_id", contactId);
  }

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (upcoming === "true") {
    query = query
      .eq("status", "scheduled")
      .gte("scheduled_at", new Date().toISOString());
  }

  if (limit) {
    query = query.limit(parseInt(limit));
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { attendee_ids, ...meetingPayload } = body;

  const { data, error } = await supabase
    .from("meetings")
    .insert(meetingPayload)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const primaryId = data?.contact_id ?? body.contact_id;
  if (primaryId) {
    await supabase.from("contacts").update({ stage: "meeting" }).eq("id", primaryId);
  }

  const extraIds = (attendee_ids ?? []).filter((id: string) => id && id !== primaryId);
  if (extraIds.length > 0) {
    await supabase.from("meeting_attendees").insert(
      extraIds.map((contact_id: string) => ({ meeting_id: data.id, contact_id }))
    );
  }

  return NextResponse.json(data, { status: 201 });
}
