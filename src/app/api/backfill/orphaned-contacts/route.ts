import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/backfill/orphaned-contacts
 * Preview orphaned contacts (have company_name but no company_id)
 */
export async function GET() {
  try {
    const supabase = createClient();

    // Find contacts with company_name but no company_id (orphaned)
    const { data: orphanedContacts, error } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, company_name, company_id")
      .not("company_name", "is", null)
      .is("company_id", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by company_name for summary
    const byCompany = new Map<string, number>();
    (orphanedContacts || []).forEach((c) => {
      const name = c.company_name || "Unknown";
      byCompany.set(name, (byCompany.get(name) || 0) + 1);
    });

    const companySummary = Array.from(byCompany.entries())
      .map(([name, count]) => ({ company_name: name, count }))
      .sort((a, b) => b.count - a.count);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/73fcbc11-1ac2-44b8-a6d3-3c6d8d6ac42d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'orphaned-contacts/route.ts:GET',message:'Preview orphaned contacts',data:{totalOrphaned:orphanedContacts?.length||0,uniqueCompanies:byCompany.size},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'fix-verify'})}).catch(()=>{});
    // #endregion

    return NextResponse.json({
      totalOrphaned: orphanedContacts?.length || 0,
      uniqueCompanyNames: byCompany.size,
      byCompany: companySummary.slice(0, 20), // Top 20
      preview: (orphanedContacts || []).slice(0, 10).map((c) => ({
        id: c.id,
        name: `${c.first_name} ${c.last_name || ""}`.trim(),
        company_name: c.company_name,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to preview orphaned contacts" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/backfill/orphaned-contacts
 * Delete orphaned contacts (have company_name but no company_id)
 * 
 * Optional body: { companyName: "Mesirow" } to delete only contacts from a specific company
 */
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    
    let companyNameFilter: string | undefined;
    try {
      const body = await request.json();
      companyNameFilter = body?.companyName;
    } catch {
      // No body or invalid JSON - delete all orphaned
    }

    // Build query for orphaned contacts
    let query = supabase
      .from("contacts")
      .delete()
      .not("company_name", "is", null)
      .is("company_id", null);

    // If specific company name provided, filter by it
    if (companyNameFilter) {
      query = query.ilike("company_name", `%${companyNameFilter}%`);
    }

    const { data: deletedRows, error } = await query.select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const deletedCount = deletedRows?.length || 0;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/73fcbc11-1ac2-44b8-a6d3-3c6d8d6ac42d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'orphaned-contacts/route.ts:POST',message:'Deleted orphaned contacts',data:{deletedCount,companyNameFilter},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'fix-verify'})}).catch(()=>{});
    // #endregion

    return NextResponse.json({
      message: "Orphaned contacts deleted",
      deleted: deletedCount,
      filter: companyNameFilter || "all orphaned contacts",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete orphaned contacts" },
      { status: 500 }
    );
  }
}
