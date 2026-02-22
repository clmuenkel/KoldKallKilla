export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

const OLD_DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

const TABLES_WITH_USER_ID = [
  "contacts",
  "calls",
  "tasks",
  "notes",
  "email_templates",
  "emails",
  "call_lists",
  "activity_log",
  "call_scripts",
  "companies",
  "persona_sets",
  "meetings",
  "meeting_notes",
  "user_targets",
  "dialer_sessions",
  "dialer_drafts",
  "dialer_pool_events",
];

export async function POST() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.id === OLD_DEFAULT_USER_ID) {
    return NextResponse.json(
      { error: "Cannot migrate data to the default user" },
      { status: 400 }
    );
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "Service role key not configured" },
      { status: 500 }
    );
  }

  const admin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: oldProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", OLD_DEFAULT_USER_ID)
    .single();

  if (!oldProfile) {
    return NextResponse.json(
      { message: "No legacy data to migrate (default user not found)" },
      { status: 200 }
    );
  }

  const results: Record<string, number> = {};

  for (const table of TABLES_WITH_USER_ID) {
    const { data, error } = await admin
      .from(table)
      .update({ user_id: user.id })
      .eq("user_id", OLD_DEFAULT_USER_ID)
      .select("id");

    if (error) {
      console.error(`Migration error for ${table}:`, error);
      results[table] = -1;
    } else {
      results[table] = data?.length ?? 0;
    }
  }

  // Migrate user_settings (PK is user_id, so we need to delete + re-insert)
  const { data: oldSettings } = await admin
    .from("user_settings")
    .select("*")
    .eq("user_id", OLD_DEFAULT_USER_ID)
    .single();

  if (oldSettings) {
    const { user_id: _uid, ...settingsData } = oldSettings;
    await admin
      .from("user_settings")
      .upsert({ user_id: user.id, ...settingsData });
    await admin
      .from("user_settings")
      .delete()
      .eq("user_id", OLD_DEFAULT_USER_ID);
    results["user_settings"] = 1;
  }

  // Migrate capacity_settings (PK is user_id)
  const { data: oldCapacity } = await admin
    .from("capacity_settings")
    .select("*")
    .eq("user_id", OLD_DEFAULT_USER_ID)
    .single();

  if (oldCapacity) {
    const { user_id: _uid, ...capacityData } = oldCapacity;
    await admin
      .from("capacity_settings")
      .upsert({ user_id: user.id, ...capacityData });
    await admin
      .from("capacity_settings")
      .delete()
      .eq("user_id", OLD_DEFAULT_USER_ID);
    results["capacity_settings"] = 1;
  }

  // Update the old profile to point to new user (or just delete it)
  await admin.from("profiles").delete().eq("id", OLD_DEFAULT_USER_ID);
  results["profiles_deleted"] = 1;

  return NextResponse.json({
    message: "Data migration complete",
    newUserId: user.id,
    migratedRows: results,
  });
}
