"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

let cachedUser: User | null = null;

export function useAuth() {
  const [user, setUser] = useState<User | null>(cachedUser);
  const [isLoading, setIsLoading] = useState(!cachedUser);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;

      // Remember me: only sign out if the user explicitly chose "don't remember me"
      // (pez-no-remember in localStorage) AND the browser was restarted
      // (sessionStorage flag is gone). Never sign out invite/reset sessions
      // which have no flags set at all.
      if (u) {
        const noRememberChosen = localStorage.getItem("pez-no-remember") === "1";
        const sessionStillActive = sessionStorage.getItem("pez-no-remember") === "1";
        if (noRememberChosen && !sessionStillActive) {
          supabase.auth.signOut();
          cachedUser = null;
          setUser(null);
          setIsLoading(false);
          return;
        }
      }

      cachedUser = u;
      setUser(u);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      cachedUser = u;
      setUser(u);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, userId: user?.id ?? null, isLoading };
}

export function useAuthId(): string | null {
  const { userId } = useAuth();
  return userId;
}
