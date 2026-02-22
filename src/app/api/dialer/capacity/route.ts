export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { 
  getDueToday, 
  getCapacityBuckets, 
  getCapacitySettings,
  getUnscheduledCounts,
  getUnreachableTodayCount,
} from "@/lib/capacity-scheduler";
import { detectBloat } from "@/lib/bloat-detector";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/dialer/capacity
 * Get current capacity status, buckets, bloat detection, unscheduled counts, and unreachable info
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;
    
    // Get all capacity data in parallel
    const [settings, dueStats, buckets, bloatStatus, unscheduledCounts] = await Promise.all([
      getCapacitySettings(userId),
      getDueToday(userId),
      getCapacityBuckets(userId),
      detectBloat(userId),
      getUnscheduledCounts(userId),
    ]);
    
    // Get unreachable count (depends on dueStats.total)
    const unreachableToday = await getUnreachableTodayCount(userId, dueStats.total);

    return NextResponse.json({
      settings: {
        targetPerDay: settings.targetPerDay,
        newQuotaPerDay: settings.newQuotaPerDay,
        windowDays: settings.windowDays,
        bloatThreshold: settings.bloatThreshold,
      },
      today: {
        total: dueStats.total,
        new: dueStats.new,
        followUp: dueStats.followUp,
        overdue: dueStats.overdue,
      },
      buckets,
      bloat: bloatStatus,
      unscheduled: {
        total: unscheduledCounts.total,
        overdue: unscheduledCounts.overdue,
      },
      unreachableToday: {
        count: unreachableToday.count,
        percentage: unreachableToday.percentage,
      },
    });
  } catch (error: any) {
    console.error("Capacity API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get capacity data" },
      { status: 500 }
    );
  }
}
