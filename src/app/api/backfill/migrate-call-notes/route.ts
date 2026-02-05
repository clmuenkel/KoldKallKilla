import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { TimestampedNote } from "@/types/database";

/**
 * Parse a timestamp string (MM:SS or HH:MM:SS) into seconds
 */
function parseTimestamp(timestamp: string): number | null {
  if (!timestamp) return null;
  
  const parts = timestamp.split(":").map(Number);
  if (parts.some(isNaN)) return null;
  
  if (parts.length === 2) {
    // MM:SS format
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // HH:MM:SS format
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }
  
  return null;
}

/**
 * Calculate created_at timestamp by adding offset to call start time
 */
function calculateCreatedAt(callStartedAt: string, timestampSeconds: number): string {
  const startTime = new Date(callStartedAt);
  const noteTime = new Date(startTime.getTime() + timestampSeconds * 1000);
  return noteTime.toISOString();
}

/**
 * GET - Preview the migration (show what will be migrated)
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Get all calls with timestamped_notes
    const { data: calls, error } = await supabase
      .from("calls")
      .select("id, contact_id, user_id, started_at, timestamped_notes")
      .not("timestamped_notes", "is", null)
      .order("started_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter to calls that actually have notes
    const callsWithNotes = (calls || []).filter(
      (call) => 
        call.timestamped_notes && 
        Array.isArray(call.timestamped_notes) && 
        call.timestamped_notes.length > 0
    );

    // Count total notes to migrate
    let totalNotes = 0;
    const preview: Array<{
      call_id: string;
      started_at: string;
      notes_count: number;
      sample_notes: string[];
    }> = [];

    for (const call of callsWithNotes.slice(0, 20)) {
      const notes = call.timestamped_notes as TimestampedNote[];
      totalNotes += notes.length;
      
      preview.push({
        call_id: call.id,
        started_at: call.started_at,
        notes_count: notes.length,
        sample_notes: notes.slice(0, 3).map((n) => `[${n.time}] ${n.note.substring(0, 50)}...`),
      });
    }

    // Check for already migrated notes
    const { count: existingCount } = await supabase
      .from("notes")
      .select("*", { count: "exact", head: true })
      .eq("source", "call");

    return NextResponse.json({
      totalCallsWithNotes: callsWithNotes.length,
      totalNotesToMigrate: totalNotes,
      alreadyMigratedNotes: existingCount || 0,
      preview,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST - Execute the migration
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun === true;

    // Get all calls with timestamped_notes
    const { data: calls, error } = await supabase
      .from("calls")
      .select("id, contact_id, user_id, started_at, timestamped_notes")
      .not("timestamped_notes", "is", null)
      .order("started_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter to calls that actually have notes
    const callsWithNotes = (calls || []).filter(
      (call) =>
        call.timestamped_notes &&
        Array.isArray(call.timestamped_notes) &&
        call.timestamped_notes.length > 0
    );

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const call of callsWithNotes) {
      // Skip calls without required data
      if (!call.contact_id || !call.user_id || !call.started_at) {
        skippedCount++;
        continue;
      }

      const notes = call.timestamped_notes as TimestampedNote[];

      for (const note of notes) {
        // Parse the timestamp
        const timestampSeconds = parseTimestamp(note.time);
        
        // Calculate created_at
        let createdAt: string;
        if (timestampSeconds !== null) {
          createdAt = calculateCreatedAt(call.started_at, timestampSeconds);
        } else {
          // Fallback to call start time if timestamp is invalid
          createdAt = call.started_at;
        }

        // Check if this note already exists (idempotent)
        const { data: existingNote } = await supabase
          .from("notes")
          .select("id")
          .eq("call_id", call.id)
          .eq("call_timestamp", note.time)
          .eq("content", note.note)
          .single();

        if (existingNote) {
          skippedCount++;
          continue;
        }

        if (dryRun) {
          migratedCount++;
          continue;
        }

        // Insert the note
        const { error: insertError } = await supabase.from("notes").insert({
          user_id: call.user_id,
          contact_id: call.contact_id,
          call_id: call.id,
          content: note.note,
          source: "call",
          call_timestamp: note.time,
          is_pinned: false,
          is_company_wide: false,
          created_at: createdAt,
        });

        if (insertError) {
          errorCount++;
          if (errors.length < 10) {
            errors.push(`Call ${call.id}: ${insertError.message}`);
          }
        } else {
          migratedCount++;
        }
      }
    }

    return NextResponse.json({
      message: dryRun ? "Dry run complete" : "Migration complete",
      dryRun,
      totalCallsProcessed: callsWithNotes.length,
      notesMigrated: migratedCount,
      notesSkipped: skippedCount,
      notesErrored: errorCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
