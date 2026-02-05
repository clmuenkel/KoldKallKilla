import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTimezoneFromLocation } from "@/lib/timezone";

/**
 * POST /api/backfill/company-timezones
 * Backfill timezone for companies that have location data but null timezone
 */
export async function POST() {
  try {
    const supabase = createClient();

    // Fetch companies where timezone is null and at least one location field is set
    const { data: companiesData, error: fetchError } = await supabase
      .from("companies")
      .select("id, city, state, country")
      .is("timezone", null);

    if (fetchError) {
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    const companies = companiesData ?? [];

    if (companies.length === 0) {
      return NextResponse.json({
        message: "No companies with null timezone found",
        updated: 0,
        skipped: 0,
        errors: 0,
      });
    }

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Process each company
    for (const company of companies) {
      // Skip if no location data at all
      if (!company.city && !company.state && !company.country) {
        skipped++;
        continue;
      }

      // Compute timezone from location
      const timezone = getTimezoneFromLocation(
        company.city,
        company.state,
        company.country
      );

      // Update the company
      const { error: updateError } = await supabase
        .from("companies")
        .update({ timezone })
        .eq("id", company.id);

      if (updateError) {
        console.error(`Failed to update company ${company.id}:`, updateError);
        errors++;
      } else {
        updated++;
      }
    }

    return NextResponse.json({
      message: "Backfill complete",
      total: companies.length,
      updated,
      skipped,
      errors,
    });
  } catch (error: any) {
    console.error("Company timezone backfill error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to backfill company timezones" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/backfill/company-timezones
 * Preview how many companies would be affected by the backfill
 */
export async function GET() {
  try {
    const supabase = createClient();

    // Count companies with null timezone
    const { count: nullTimezoneCount, error: countError } = await supabase
      .from("companies")
      .select("id", { count: "exact", head: true })
      .is("timezone", null);

    if (countError) {
      return NextResponse.json(
        { error: countError.message },
        { status: 500 }
      );
    }

    // Count companies with null timezone but have location data
    const { data: companiesWithLocation, error: fetchError } = await supabase
      .from("companies")
      .select("id, city, state, country")
      .is("timezone", null);

    if (fetchError) {
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    const withLocationData = (companiesWithLocation ?? []).filter(
      (c) => c.city || c.state || c.country
    ).length;

    const withoutLocationData = (nullTimezoneCount ?? 0) - withLocationData;

    return NextResponse.json({
      nullTimezoneCount: nullTimezoneCount ?? 0,
      canBackfill: withLocationData,
      noLocationData: withoutLocationData,
    });
  } catch (error: any) {
    console.error("Company timezone backfill preview error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to preview backfill" },
      { status: 500 }
    );
  }
}
