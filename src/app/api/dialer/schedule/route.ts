export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { scheduleContacts, getCapacitySettings } from "@/lib/capacity-scheduler";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/dialer/schedule
 * Schedule contacts across business days based on capacity settings
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      contactIds, 
      targetPerDay, 
      newQuotaPerDay, 
      windowDays 
    } = body;

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json(
        { error: "contactIds array is required" },
        { status: 400 }
      );
    }

    const userId = user.id;
    
    // Get user's settings as defaults
    const settings = await getCapacitySettings(userId);
    
    const result = await scheduleContacts(userId, contactIds, {
      targetPerDay: targetPerDay ?? settings.targetPerDay,
      newQuotaPerDay: newQuotaPerDay ?? settings.newQuotaPerDay,
      windowDays: windowDays ?? settings.windowDays,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Schedule API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to schedule contacts" },
      { status: 500 }
    );
  }
}
