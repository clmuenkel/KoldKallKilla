"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthId } from "@/hooks/use-auth";

export interface OutlookEvent {
  uid: string;
  title: string;
  start: string;
  end: string | null;
  location: string | null;
  attendees: string[];
  organizer: string | null;
  // enriched
  contactId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactCompanyId?: string | null;
}

/** The user's saved Outlook .ics share URL (on profiles). */
export function useOutlookUrl() {
  const supabase = createClient();
  const userId = useAuthId();
  return useQuery<string | null>({
    queryKey: ["outlook-url", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("outlook_ics_url")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as any)?.outlook_ics_url ?? null;
    },
  });
}

export function useSaveOutlookUrl() {
  const supabase = createClient();
  const userId = useAuthId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (url: string | null) => {
      const { error } = await supabase
        .from("profiles")
        .update({ outlook_ics_url: url })
        .eq("id", userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outlook-url"] });
      queryClient.invalidateQueries({ queryKey: ["outlook-events"] });
    },
  });
}

/** Upcoming Outlook events (next ~3 weeks), enriched with matched CRM contacts. */
export function useOutlookEvents() {
  const supabase = createClient();
  const userId = useAuthId();
  const { data: url } = useOutlookUrl();

  return useQuery<OutlookEvent[]>({
    queryKey: ["outlook-events", userId, url],
    enabled: !!userId && !!url,
    staleTime: 30 * 60 * 1000, // refetch the calendar at most every 30 min
    queryFn: async () => {
      const res = await fetch("/api/outlook-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Failed to read calendar");
      }
      const { events } = (await res.json()) as { events: OutlookEvent[] };

      // Match each event to a CRM contact by attendee email → name + phone.
      const allEmails = Array.from(
        new Set(events.flatMap((e) => e.attendees).filter(Boolean))
      );
      const emailToContact = new Map<
        string,
        { id: string; name: string; phone: string | null; companyId: string | null }
      >();
      if (allEmails.length) {
        const { data } = await supabase
          .from("contacts")
          .select("id, first_name, last_name, email, mobile, phone, company_id")
          .in("email", allEmails);
        for (const c of (data as any[]) ?? []) {
          if (c.email) {
            emailToContact.set(c.email.toLowerCase(), {
              id: c.id,
              name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim(),
              phone: c.mobile || c.phone || null,
              companyId: c.company_id ?? null,
            });
          }
        }
      }

      return events.map((e) => {
        const match = e.attendees.map((a) => emailToContact.get(a)).find(Boolean);
        return {
          ...e,
          contactId: match?.id ?? null,
          contactName: match?.name ?? null,
          contactPhone: match?.phone ?? null,
          contactCompanyId: match?.companyId ?? null,
        };
      });
    },
  });
}
