/**
 * Backfill Contact Stages Script
 * 
 * Updates all existing contacts' stages based on their call and meeting history.
 * 
 * Priority (highest wins):
 * 1. meeting   - contact has at least one meeting record
 * 2. qualified - contact has a call with outcome="connected" AND positive disposition
 * 3. contacted - contact has any calls
 * 4. fresh     - no calls or meetings (default)
 * 
 * Run with: npm run backfill-stages
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables:");
  if (!supabaseUrl) console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseServiceKey) console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Positive dispositions that indicate a qualified lead
const POSITIVE_DISPOSITIONS = ["meeting", "interested_follow_up"];

function isPositiveDisposition(disposition: string | null): boolean {
  if (!disposition) return false;
  return (
    POSITIVE_DISPOSITIONS.includes(disposition) ||
    disposition.includes("interested")
  );
}

// Helper to fetch all rows with pagination (Supabase defaults to 1000 row limit)
async function fetchAll<T>(
  table: string,
  select: string
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  let allData: T[] = [];
  let from = 0;
  
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + PAGE_SIZE - 1);
    
    if (error) {
      throw new Error(`Failed to fetch ${table}: ${error.message}`);
    }
    
    if (!data || data.length === 0) break;
    
    allData = allData.concat(data as T[]);
    
    if (data.length < PAGE_SIZE) break; // Last page
    from += PAGE_SIZE;
  }
  
  return allData;
}

async function backfillStages() {
  console.log("Starting contact stage backfill...\n");

  // 1. Get ALL contacts (with pagination)
  console.log("Fetching all contacts...");
  let contacts: { id: string; first_name: string; last_name: string | null; stage: string | null }[];
  try {
    contacts = await fetchAll("contacts", "id, first_name, last_name, stage");
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  }

  if (contacts.length === 0) {
    console.log("No contacts found.");
    return;
  }

  console.log(`Found ${contacts.length} contacts to process.\n`);

  // 2. Get ALL meetings (with pagination)
  console.log("Fetching all meetings...");
  let meetingData: { contact_id: string | null }[];
  try {
    meetingData = await fetchAll("meetings", "contact_id");
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  }

  const contactsWithMeetings = new Set(
    meetingData.map((m) => m.contact_id).filter(Boolean) as string[]
  );
  console.log(`Contacts with meetings: ${contactsWithMeetings.size}`);

  // 3. Get ALL calls (with pagination)
  console.log("Fetching all calls...");
  let callsData: { contact_id: string | null; outcome: string; disposition: string | null }[];
  try {
    callsData = await fetchAll("calls", "contact_id, outcome, disposition");
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  }
  console.log(`Total calls fetched: ${callsData.length}`);

  // Build sets: contacts with any calls, contacts with qualified calls
  const contactsWithCalls = new Set<string>();
  const contactsQualified = new Set<string>();

  for (const call of callsData || []) {
    if (!call.contact_id) continue;
    
    contactsWithCalls.add(call.contact_id);
    
    if (call.outcome === "connected" && isPositiveDisposition(call.disposition)) {
      contactsQualified.add(call.contact_id);
    }
  }

  console.log(`Contacts with any calls: ${contactsWithCalls.size}`);
  console.log(`Contacts with qualified calls: ${contactsQualified.size}\n`);

  // 4. Compute new stage for each contact and update if different
  const stats = {
    meeting: 0,
    qualified: 0,
    contacted: 0,
    fresh: 0,
    unchanged: 0,
    errors: 0,
  };

  for (const contact of contacts) {
    let newStage: string;

    // Priority: meeting > qualified > contacted > fresh
    if (contactsWithMeetings.has(contact.id)) {
      newStage = "meeting";
    } else if (contactsQualified.has(contact.id)) {
      newStage = "qualified";
    } else if (contactsWithCalls.has(contact.id)) {
      newStage = "contacted";
    } else {
      newStage = "fresh";
    }

    const currentStage = contact.stage || "fresh";

    if (newStage === currentStage) {
      stats.unchanged++;
      continue;
    }

    // Update the contact's stage
    const { error: updateError } = await supabase
      .from("contacts")
      .update({ stage: newStage })
      .eq("id", contact.id);

    if (updateError) {
      console.error(
        `Failed to update ${contact.first_name} ${contact.last_name}:`,
        updateError.message
      );
      stats.errors++;
    } else {
      stats[newStage as keyof typeof stats]++;
      console.log(
        `Updated: ${contact.first_name} ${contact.last_name || ""} - ${currentStage} → ${newStage}`
      );
    }
  }

  // 5. Print summary
  console.log("\n========== BACKFILL COMPLETE ==========");
  console.log(`Total contacts: ${contacts.length}`);
  console.log(`Updated to "meeting": ${stats.meeting}`);
  console.log(`Updated to "qualified": ${stats.qualified}`);
  console.log(`Updated to "contacted": ${stats.contacted}`);
  console.log(`Updated to "fresh": ${stats.fresh}`);
  console.log(`Unchanged: ${stats.unchanged}`);
  if (stats.errors > 0) {
    console.log(`Errors: ${stats.errors}`);
  }
  console.log("========================================\n");
}

// Run the script
backfillStages()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  });
