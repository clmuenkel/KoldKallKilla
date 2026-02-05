"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Contact, InsertTables, UpdateTables } from "@/types/database";

export interface ContactFilters {
  stage?: string;
  search?: string;
  limit?: number;
  industry?: string;
  hasPhone?: boolean;
  hasEmail?: boolean;
  aaaOnly?: boolean;
  bantScore?: number; // 0-4
  lastContacted?: "never" | "today" | "week" | "month" | "older";
  sortBy?: "name" | "created" | "last_contacted" | "bant";
  sortOrder?: "asc" | "desc";
  // Pagination
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useContacts(filters?: ContactFilters) {
  const supabase = createClient();

  return useQuery<Contact[]>({
    queryKey: ["contacts", filters],
    queryFn: async () => {
      let countQuery = supabase
        .from("contacts")
        .select("id", { count: "exact", head: true });
      const applyFilters = (query: ReturnType<typeof supabase.from>) => {
        let q = query;

        // Stage filter
        if (filters?.stage && filters.stage !== "all") {
          q = q.eq("stage", filters.stage);
        }

        // Search filter (includes phone numbers for callback lookup)
        if (filters?.search) {
          q = q.or(
            `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,title.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,mobile.ilike.%${filters.search}%`
          );
        }

        // Industry filter
        if (filters?.industry && filters.industry !== "all") {
          q = q.eq("industry", filters.industry);
        }

        // Has phone filter
        if (filters?.hasPhone === true) {
          q = q.or("phone.neq.,mobile.neq.");
        }

        // Has email filter
        if (filters?.hasEmail === true) {
          q = q.not("email", "is", null);
        }

        // AAA filter
        if (filters?.aaaOnly === true) {
          q = q.eq("is_aaa", true);
        }

        // Last contacted filter
        if (filters?.lastContacted) {
          const now = new Date();
          switch (filters.lastContacted) {
            case "never":
              q = q.is("last_contacted_at", null);
              break;
            case "today":
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              q = q.gte("last_contacted_at", today.toISOString());
              break;
            case "week":
              const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              q = q.gte("last_contacted_at", weekAgo.toISOString());
              break;
            case "month":
              const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              q = q.gte("last_contacted_at", monthAgo.toISOString());
              break;
            case "older":
              const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              q = q.lt("last_contacted_at", thirtyDaysAgo.toISOString());
              break;
          }
        }

        return q;
      };

      const applySorting = (query: ReturnType<typeof supabase.from>) => {
        let q = query;
        const sortOrder = filters?.sortOrder === "asc" ? true : false;
        switch (filters?.sortBy) {
          case "name":
            q = q.order("first_name", { ascending: sortOrder });
            break;
          case "last_contacted":
            q = q.order("last_contacted_at", { ascending: sortOrder, nullsFirst: false });
            break;
          case "bant":
            // BANT is computed, so we'll sort client-side for now
            q = q.order("created_at", { ascending: false });
            break;
          default:
            q = q.order("created_at", { ascending: false });
        }
        return q;
      };

      countQuery = applyFilters(countQuery);

      const { count: totalCount, error: countError } = await countQuery;
      if (countError) throw countError;

      const buildQuery = () => {
        let q = supabase.from("contacts").select("*");
        q = applyFilters(q);
        q = applySorting(q);
        return q;
      };

      let data: Contact[] | null = null;
      let error: any = null;

      if (filters?.limit) {
        const { data: limitedData, error: limitedError } = await buildQuery().limit(filters.limit);
        data = limitedData as Contact[] | null;
        error = limitedError;
      } else {
        const pageSize = 1000;
        let from = 0;
        const allContacts: Contact[] = [];
        while (true) {
          const { data: pageData, error: pageError } = await buildQuery().range(from, from + pageSize - 1);
          if (pageError) {
            error = pageError;
            break;
          }
          const page = (pageData as Contact[]) || [];
          allContacts.push(...page);
          if (page.length < pageSize) break;
          from += pageSize;
        }
        data = allContacts;
      }

      if (error) throw error;
      
      let contacts = data as Contact[];

      // BANT score filter (client-side since it's computed)
      if (filters?.bantScore !== undefined && filters.bantScore >= 0) {
        contacts = contacts.filter(c => {
          const score = [c.has_budget, c.is_authority, c.has_need, c.has_timeline].filter(Boolean).length;
          return score >= filters.bantScore!;
        });
      }

      // BANT sorting (client-side)
      if (filters?.sortBy === "bant") {
        contacts.sort((a, b) => {
          const scoreA = [a.has_budget, a.is_authority, a.has_need, a.has_timeline].filter(Boolean).length;
          const scoreB = [b.has_budget, b.is_authority, b.has_need, b.has_timeline].filter(Boolean).length;
          return filters.sortOrder === "asc" ? scoreA - scoreB : scoreB - scoreA;
        });
      }

      return contacts;
    },
  });
}

/**
 * Paginated contacts hook for large datasets
 */
export function usePaginatedContacts(filters?: ContactFilters) {
  const supabase = createClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 50;

  return useQuery<PaginatedResult<Contact>>({
    queryKey: ["contacts-paginated", filters],
    queryFn: async () => {
      // First, get total count with filters (but without pagination)
      let countQuery = supabase
        .from("contacts")
        .select("id", { count: "exact", head: true });

      // Apply filters to count query
      if (filters?.stage && filters.stage !== "all") {
        countQuery = countQuery.eq("stage", filters.stage);
      }
      if (filters?.search) {
        countQuery = countQuery.or(
          `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,title.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,mobile.ilike.%${filters.search}%`
        );
      }
      if (filters?.industry && filters.industry !== "all") {
        countQuery = countQuery.eq("industry", filters.industry);
      }
      if (filters?.hasPhone === true) {
        countQuery = countQuery.or("phone.neq.,mobile.neq.");
      }
      if (filters?.hasEmail === true) {
        countQuery = countQuery.not("email", "is", null);
      }
      if (filters?.aaaOnly === true) {
        countQuery = countQuery.eq("is_aaa", true);
      }

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      const totalCount = count || 0;

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/73fcbc11-1ac2-44b8-a6d3-3c6d8d6ac42d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-contacts.ts:230',message:'usePaginatedContacts query start',data:{filters,totalCount},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,E'})}).catch(()=>{});
      // #endregion

      // Now get paginated data
      let query = supabase
        .from("contacts")
        .select("*");

      // Apply same filters
      if (filters?.stage && filters.stage !== "all") {
        query = query.eq("stage", filters.stage);
      }
      if (filters?.search) {
        query = query.or(
          `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,title.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,mobile.ilike.%${filters.search}%`
        );
      }
      if (filters?.industry && filters.industry !== "all") {
        query = query.eq("industry", filters.industry);
      }
      if (filters?.hasPhone === true) {
        query = query.or("phone.neq.,mobile.neq.");
      }
      if (filters?.hasEmail === true) {
        query = query.not("email", "is", null);
      }
      if (filters?.aaaOnly === true) {
        query = query.eq("is_aaa", true);
      }

      // Sorting
      const sortOrder = filters?.sortOrder === "asc" ? true : false;
      switch (filters?.sortBy) {
        case "name":
          query = query.order("first_name", { ascending: sortOrder });
          break;
        case "last_contacted":
          query = query.order("last_contacted_at", { ascending: sortOrder, nullsFirst: false });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error } = await query;
      if (error) throw error;

      let contacts = data as Contact[];

      // #region agent log
      const orphanedContacts = contacts.filter(c => c.company_name && !c.company_id);
      const mesirowContacts = contacts.filter(c => c.company_name?.toLowerCase().includes('mesirow'));
      fetch('http://127.0.0.1:7242/ingest/73fcbc11-1ac2-44b8-a6d3-3c6d8d6ac42d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-contacts.ts:282',message:'Contacts fetched - checking for orphans',data:{totalFetched:contacts.length,orphanedCount:orphanedContacts.length,mesirowCount:mesirowContacts.length,mesirowSample:mesirowContacts.slice(0,3).map(c=>({id:c.id,first_name:c.first_name,company_id:c.company_id,company_name:c.company_name}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,D'})}).catch(()=>{});
      // #endregion

      // BANT score filter (client-side)
      if (filters?.bantScore !== undefined && filters.bantScore >= 0) {
        contacts = contacts.filter(c => {
          const score = [c.has_budget, c.is_authority, c.has_need, c.has_timeline].filter(Boolean).length;
          return score >= filters.bantScore!;
        });
      }

      // BANT sorting (client-side)
      if (filters?.sortBy === "bant") {
        contacts.sort((a, b) => {
          const scoreA = [a.has_budget, a.is_authority, a.has_need, a.has_timeline].filter(Boolean).length;
          const scoreB = [b.has_budget, b.is_authority, b.has_need, b.has_timeline].filter(Boolean).length;
          return filters.sortOrder === "asc" ? scoreA - scoreB : scoreB - scoreA;
        });
      }

      return {
        data: contacts,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      };
    },
  });
}

export function useContact(id: string) {
  const supabase = createClient();

  return useQuery<Contact>({
    queryKey: ["contact", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Contact;
    },
    enabled: !!id,
  });
}

export function useCreateContact() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contact: InsertTables<"contacts">) => {
      const { data, error } = await supabase
        .from("contacts")
        .insert(contact)
        .select()
        .single();
      if (error) throw error;
      return data as Contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useUpdateContact() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateTables<"contacts">;
    }) => {
      const { data, error } = await supabase
        .from("contacts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Contact;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact", data.id] });
    },
  });
}

export function useDeleteContact() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
      return id; // Return the deleted ID for use in onSuccess
    },
    onSuccess: (deletedId) => {
      // Invalidate all queries that reference contacts
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact", deletedId] });
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] }); // Company contact counts
    },
  });
}

export function useBulkCreateContacts() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contacts: InsertTables<"contacts">[]) => {
      const { data, error } = await supabase
        .from("contacts")
        .insert(contacts)
        .select();
      if (error) throw error;
      return data as Contact[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useBulkDeleteContacts() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("contacts").delete().in("id", ids);
      if (error) throw error;
      return ids; // Return deleted IDs
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useContactsByStage() {
  const supabase = createClient();

  return useQuery<Record<string, number>>({
    queryKey: ["contacts-by-stage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("stage")
        .eq("status", "active");
      
      if (error) throw error;

      const counts: Record<string, number> = {};
      data.forEach((contact) => {
        counts[contact.stage] = (counts[contact.stage] || 0) + 1;
      });
      
      return counts;
    },
  });
}
