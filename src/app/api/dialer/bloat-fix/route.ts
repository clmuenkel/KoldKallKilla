export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { 
  getRemovalCandidates, 
  applyBloatFix, 
  autoFixBloat,
  detectBloat,
  type SuggestedAction 
} from "@/lib/bloat-detector";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/dialer/bloat-fix
 * Get removal candidates for bloat fixing
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;
    const { searchParams } = new URL(request.url);
    const excludeAaa = searchParams.get("excludeAaa") !== "false";
    const limit = parseInt(searchParams.get("limit") || "100");

    const candidates = await getRemovalCandidates(userId, { 
      excludeAaa, 
      limit 
    });

    return NextResponse.json(candidates);
  } catch (error: any) {
    console.error("Bloat-fix GET API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get removal candidates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dialer/bloat-fix
 * Apply fixes to selected candidates, or auto-fix
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;
    const body = await request.json();
    const { candidates, autoFix } = body;

    // Auto-fix mode
    if (autoFix) {
      const bloatStatus = await detectBloat(userId);
      if (bloatStatus.overage <= 0) {
        return NextResponse.json({ 
          message: "No bloat to fix",
          applied: 0 
        });
      }

      const result = await autoFixBloat(userId, bloatStatus.overage);
      return NextResponse.json({
        message: `Auto-fixed ${result.applied} contacts`,
        ...result,
      });
    }

    // Manual fix mode
    if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
      return NextResponse.json(
        { error: "candidates array is required (or set autoFix: true)" },
        { status: 400 }
      );
    }

    // Validate candidate format
    for (const c of candidates) {
      if (!c.contactId || !c.action) {
        return NextResponse.json(
          { error: "Each candidate must have contactId and action" },
          { status: 400 }
        );
      }
      if (!["pause_12mo", "pause_6mo", "throttle_10d", "throttle_14d"].includes(c.action)) {
        return NextResponse.json(
          { error: `Invalid action: ${c.action}` },
          { status: 400 }
        );
      }
    }

    const result = await applyBloatFix(userId, candidates as { contactId: string; action: SuggestedAction }[]);

    return NextResponse.json({
      message: `Applied ${result.applied} fixes`,
      ...result,
    });
  } catch (error: any) {
    console.error("Bloat-fix POST API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to apply fixes" },
      { status: 500 }
    );
  }
}
