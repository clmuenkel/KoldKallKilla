import { NextRequest, NextResponse } from "next/server";
import { 
  getBackfillPreview, 
  getEligibleUnscheduledContacts,
  scheduleContacts,
  getCapacitySettings,
  DEFAULT_TARGET_PER_DAY,
} from "@/lib/capacity-scheduler";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/dialer/backfill
 * Preview what will be scheduled (no changes made)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;
    const preview = await getBackfillPreview(userId);
    
    return NextResponse.json(preview);
  } catch (error: any) {
    console.error("Backfill preview error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get backfill preview" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dialer/backfill
 * Execute the backfill (schedules all eligible unscheduled contacts)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;
    const body = await request.json().catch(() => ({}));
    const { includeOverdue = true, dryRun = false } = body;
    
    // Get user settings
    const settings = await getCapacitySettings(userId);
    
    // Collect all eligible contacts in batches
    const BATCH_SIZE = 500;
    let offset = 0;
    let totalScheduled = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    const fullDistribution = new Map<string, number>();
    let loopCount = 0;
    let lastFirstId: string | null = null;
    
    // Keep fetching and scheduling in batches
    while (true) {
      loopCount += 1;
      const contacts = await getEligibleUnscheduledContacts(userId, {
        includeOverdue,
        limit: BATCH_SIZE,
        offset: 0,
      });
      
      if (contacts.length === 0) break;
      if (lastFirstId && contacts[0]?.id === lastFirstId) {
        break;
      }
      lastFirstId = contacts[0]?.id || null;
      
      if (dryRun) {
        // Just count, don't schedule
        totalScheduled += contacts.length;
      } else {
        // Actually schedule this batch
        const contactIds = contacts.map(c => c.id);
        
        try {
          const result = await scheduleContacts(userId, contactIds, {
            targetPerDay: settings.targetPerDay,
            newQuotaPerDay: settings.newQuotaPerDay,
            windowDays: settings.windowDays,
          });
          
          totalScheduled += result.scheduled;
          totalSkipped += contacts.length - result.scheduled;
          
          // Merge distribution
          for (const { date, count } of result.distribution) {
            fullDistribution.set(date, (fullDistribution.get(date) || 0) + count);
          }
          if (result.scheduled === 0) {
            break;
          }
        } catch (error) {
          console.error(`Backfill batch error at offset ${offset}:`, error);
          totalErrors += contacts.length;
        }
      }
      
      offset += BATCH_SIZE;
      
      // Safety limit: don't process more than 10k contacts in one request
      if (offset >= 10000) {
        console.warn("Backfill safety limit reached (10k contacts)");
        break;
      }
    }
    
    // Build distribution array
    const distribution = Array.from(fullDistribution.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return NextResponse.json({
      scheduled: totalScheduled,
      skipped: totalSkipped,
      errors: totalErrors,
      distribution,
      dryRun,
    });
  } catch (error: any) {
    console.error("Backfill execution error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute backfill" },
      { status: 500 }
    );
  }
}
