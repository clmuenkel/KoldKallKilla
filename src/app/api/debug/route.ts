import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      SUPABASE_URL_SET: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_ANON_KEY_SET: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_KEY_SET: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_URL_VALUE: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/https?:\/\//, "").slice(0, 20) + "...",
    },
  };

  // Test 1: Server-side auth check
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    results.auth = {
      ok: !error,
      user: data?.user?.email || null,
      error: error?.message || null,
    };
  } catch (e: any) {
    results.auth = { ok: false, error: e.message };
  }

  // Test 2: Direct Supabase REST query (bypasses RLS with count)
  try {
    const supabase = createClient();
    const { count, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });
    results.db_query = {
      ok: !error,
      profile_count: count,
      error: error?.message || null,
    };
  } catch (e: any) {
    results.db_query = { ok: false, error: e.message };
  }

  // Test 3: Direct fetch to Supabase to test connectivity
  try {
    const start = Date.now();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        signal: AbortSignal.timeout(10000),
      }
    );
    const elapsed = Date.now() - start;
    results.direct_fetch = {
      ok: res.ok,
      status: res.status,
      elapsed_ms: elapsed,
    };
  } catch (e: any) {
    results.direct_fetch = { ok: false, error: e.message };
  }

  return NextResponse.json(results, {
    headers: { "Cache-Control": "no-store" },
  });
}
