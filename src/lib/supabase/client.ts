import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

function getSupabaseUrl() {
  // In the browser, proxy through our server to avoid direct Supabase connectivity issues
  if (typeof window !== "undefined") {
    return `${window.location.origin}/supabase-proxy`;
  }
  return process.env.NEXT_PUBLIC_SUPABASE_URL!;
}

export function createClient() {
  if (client) return client;

  client = createBrowserClient<Database>(
    getSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return client;
}
