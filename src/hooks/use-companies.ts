"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Company, Contact, Call, CallWithContact, InsertTables, UpdateTables } from "@/types/database";

export interface CompanyWithStats extends Company {
  contact_count: number;
  last_contacted_at: string | null;
  contacts?: Contact[];
  talked_to?: {
    first_name: string;
    last_name: string | null;
    title: string | null;
    last_contacted_at: string | null;
  } | null;
}

export interface CompanyFilters {
  search?: string;
  industry?: string;
  hasContacts?: boolean;
  limit?: number;
  page?: number;
  pageSize?: number;
}

export interface PaginatedCompanyResult {
  data: CompanyWithStats[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Fetch all companies with contact counts and last contacted date
 * Search includes company fields AND companies that have contacts matching the search term
 */
export function useCompanies(filters?: CompanyFilters) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["companies", filters],
    queryFn: async () => {
      let companyIds: string[] = [];

      if (filters?.search) {
        // Step 1: Get company IDs where company fields match
        let companyQuery = supabase
          .from("companies")
          .select("id");
        
        // Search across company fields: name, domain, industry, city, state, country
        companyQuery = companyQuery.or(
          `name.ilike.%${filters.search}%,domain.ilike.%${filters.search}%,industry.ilike.%${filters.search}%,city.ilike.%${filters.search}%,state.ilike.%${filters.search}%,country.ilike.%${filters.search}%`
        );

        if (filters.industry) {
          companyQuery = companyQuery.eq("industry", filters.industry);
        }

        const { data: companyMatches } = await companyQuery;
        const companyMatchIds = (companyMatches || []).map(c => c.id);

        // Step 2: Get company IDs from contacts that match the search term
        const { data: contactMatches } = await supabase
          .from("contacts")
          .select("company_id")
          .not("company_id", "is", null)
          .or(
            `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,title.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,mobile.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`
          );

        const contactCompanyIds = (contactMatches || [])
          .map(c => c.company_id)
          .filter((id): id is string => id !== null);

        // Step 3: Merge and dedupe company IDs
        companyIds = [...new Set([...companyMatchIds, ...contactCompanyIds])];

        if (companyIds.length === 0) {
          return [] as CompanyWithStats[];
        }

        // Step 4: Fetch companies by merged IDs
        let finalQuery = supabase
          .from("companies")
          .select("*")
          .in("id", companyIds)
          .order("name", { ascending: true });

        if (filters.industry) {
          finalQuery = finalQuery.eq("industry", filters.industry);
        }

        if (filters.limit) {
          finalQuery = finalQuery.limit(filters.limit);
        }

        const { data: companiesData, error } = await finalQuery;
        if (error) throw error;

        const companies = companiesData as Company[];
        if (!companies || companies.length === 0) {
          return [] as CompanyWithStats[];
        }

        // Get contact stats for these companies
        const finalCompanyIds = companies.map(c => c.id);
        const { data: contactStatsData } = await supabase
          .from("contacts")
          .select("company_id, last_contacted_at")
          .in("company_id", finalCompanyIds);

        const contactStats = contactStatsData as { company_id: string | null; last_contacted_at: string | null }[] | null;
        const statsMap = new Map<string, { count: number; lastContacted: string | null }>();
        
        contactStats?.forEach((contact) => {
          if (!contact.company_id) return;
          const current = statsMap.get(contact.company_id) || { count: 0, lastContacted: null };
          current.count++;
          if (contact.last_contacted_at) {
            if (!current.lastContacted || contact.last_contacted_at > current.lastContacted) {
              current.lastContacted = contact.last_contacted_at;
            }
          }
          statsMap.set(contact.company_id, current);
        });

        const companiesWithStats: CompanyWithStats[] = companies.map((company) => {
          const stats = statsMap.get(company.id) || { count: 0, lastContacted: null };
          return {
            ...company,
            contact_count: stats.count,
            last_contacted_at: stats.lastContacted,
          };
        });

        if (filters.hasContacts) {
          return companiesWithStats.filter((c) => c.contact_count > 0);
        }

        return companiesWithStats;
      }

      // No search term - use simple query
      let query = supabase
        .from("companies")
        .select("*")
        .order("name", { ascending: true });

      if (filters?.industry) {
        query = query.eq("industry", filters.industry);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data: companiesData, error } = await query;
      
      if (error) throw error;

      const companies = companiesData as Company[];
      if (!companies || companies.length === 0) {
        return [] as CompanyWithStats[];
      }

      // Get contact counts and last contacted for each company
      const finalCompanyIds = companies.map((c) => c.id);
      
      const { data: contactStatsData } = await supabase
        .from("contacts")
        .select("company_id, last_contacted_at")
        .in("company_id", finalCompanyIds);

      const contactStats = contactStatsData as { company_id: string | null; last_contacted_at: string | null }[] | null;

      // Aggregate stats per company
      const statsMap = new Map<string, { count: number; lastContacted: string | null }>();
      
      contactStats?.forEach((contact) => {
        if (!contact.company_id) return;
        
        const current = statsMap.get(contact.company_id) || { count: 0, lastContacted: null };
        current.count++;
        
        if (contact.last_contacted_at) {
          if (!current.lastContacted || contact.last_contacted_at > current.lastContacted) {
            current.lastContacted = contact.last_contacted_at;
          }
        }
        
        statsMap.set(contact.company_id, current);
      });

      // Merge stats into companies
      const companiesWithStats: CompanyWithStats[] = companies.map((company) => {
        const stats = statsMap.get(company.id) || { count: 0, lastContacted: null };
        return {
          ...company,
          contact_count: stats.count,
          last_contacted_at: stats.lastContacted,
        };
      });

      // Filter by hasContacts if specified
      if (filters?.hasContacts) {
        return companiesWithStats.filter((c) => c.contact_count > 0);
      }

      return companiesWithStats;
    },
  });
}

/**
 * Paginated companies hook for large datasets
 * Search includes company fields AND companies that have contacts matching the search term
 */
export function usePaginatedCompanies(filters?: CompanyFilters) {
  const supabase = createClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 50;

  return useQuery<PaginatedCompanyResult>({
    queryKey: ["companies-paginated", filters],
    queryFn: async () => {
      if (filters?.search) {
        // When searching, we need to merge company-based and contact-based results
        // Step 1: Get company IDs where company fields match
        let companyQuery = supabase
          .from("companies")
          .select("id");
        
        // Search across company fields: name, domain, industry, city, state, country
        companyQuery = companyQuery.or(
          `name.ilike.%${filters.search}%,domain.ilike.%${filters.search}%,industry.ilike.%${filters.search}%,city.ilike.%${filters.search}%,state.ilike.%${filters.search}%,country.ilike.%${filters.search}%`
        );

        if (filters.industry) {
          companyQuery = companyQuery.eq("industry", filters.industry);
        }

        const { data: companyMatches } = await companyQuery;
        const companyMatchIds = (companyMatches || []).map(c => c.id);

        // Step 2: Get company IDs from contacts that match the search term
        const { data: contactMatches } = await supabase
          .from("contacts")
          .select("company_id")
          .not("company_id", "is", null)
          .or(
            `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,title.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,mobile.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`
          );

        const contactCompanyIds = (contactMatches || [])
          .map(c => c.company_id)
          .filter((id): id is string => id !== null);

        // Step 3: Merge and dedupe company IDs
        const allCompanyIds = [...new Set([...companyMatchIds, ...contactCompanyIds])];
        const totalCount = allCompanyIds.length;

        if (totalCount === 0) {
          return {
            data: [] as CompanyWithStats[],
            totalCount: 0,
            page,
            pageSize,
            totalPages: 0,
          };
        }

        // Step 4: Fetch all matching companies to sort them, then paginate
        let allCompaniesQuery = supabase
          .from("companies")
          .select("*")
          .in("id", allCompanyIds)
          .order("name", { ascending: true });

        if (filters.industry) {
          allCompaniesQuery = allCompaniesQuery.eq("industry", filters.industry);
        }

        const { data: allCompaniesData, error: allCompaniesError } = await allCompaniesQuery;
        if (allCompaniesError) throw allCompaniesError;

        const allCompanies = allCompaniesData as Company[];
        
        // Apply pagination in memory (companies are sorted by name)
        const from = (page - 1) * pageSize;
        const companies = allCompanies.slice(from, from + pageSize);

        if (companies.length === 0) {
          return {
            data: [] as CompanyWithStats[],
            totalCount: allCompanies.length,
            page,
            pageSize,
            totalPages: Math.ceil(allCompanies.length / pageSize),
          };
        }

        // Get contact stats for this page of companies
        const pageCompanyIds = companies.map(c => c.id);
        const { data: contactStatsData } = await supabase
          .from("contacts")
          .select("company_id, last_contacted_at")
          .in("company_id", pageCompanyIds);

        const contactStats = contactStatsData as { company_id: string | null; last_contacted_at: string | null }[] | null;
        const statsMap = new Map<string, { count: number; lastContacted: string | null }>();
        
        contactStats?.forEach((contact) => {
          if (!contact.company_id) return;
          const current = statsMap.get(contact.company_id) || { count: 0, lastContacted: null };
          current.count++;
          if (contact.last_contacted_at) {
            if (!current.lastContacted || contact.last_contacted_at > current.lastContacted) {
              current.lastContacted = contact.last_contacted_at;
            }
          }
          statsMap.set(contact.company_id, current);
        });

        const companiesWithStats: CompanyWithStats[] = companies.map((company) => {
          const stats = statsMap.get(company.id) || { count: 0, lastContacted: null };
          return {
            ...company,
            contact_count: stats.count,
            last_contacted_at: stats.lastContacted,
          };
        });

        return {
          data: companiesWithStats,
          totalCount: allCompanies.length,
          page,
          pageSize,
          totalPages: Math.ceil(allCompanies.length / pageSize),
        };
      }

      // No search term - use simple paginated query
      // Get total count
      let countQuery = supabase
        .from("companies")
        .select("id", { count: "exact", head: true });

      if (filters?.industry) {
        countQuery = countQuery.eq("industry", filters.industry);
      }

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      const totalCount = count || 0;

      // Get paginated companies
      let query = supabase
        .from("companies")
        .select("*")
        .order("name", { ascending: true });

      if (filters?.industry) {
        query = query.eq("industry", filters.industry);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data: companiesData, error } = await query;
      if (error) throw error;

      const companies = companiesData as Company[];
      if (!companies || companies.length === 0) {
        return {
          data: [] as CompanyWithStats[],
          totalCount,
          page,
          pageSize,
          totalPages: Math.ceil(totalCount / pageSize),
        };
      }

      // Get contact stats
      const companyIds = companies.map((c) => c.id);
      const { data: contactStatsData } = await supabase
        .from("contacts")
        .select("company_id, last_contacted_at")
        .in("company_id", companyIds);

      const contactStats = contactStatsData as { company_id: string | null; last_contacted_at: string | null }[] | null;
      const statsMap = new Map<string, { count: number; lastContacted: string | null }>();
      
      contactStats?.forEach((contact) => {
        if (!contact.company_id) return;
        const current = statsMap.get(contact.company_id) || { count: 0, lastContacted: null };
        current.count++;
        if (contact.last_contacted_at) {
          if (!current.lastContacted || contact.last_contacted_at > current.lastContacted) {
            current.lastContacted = contact.last_contacted_at;
          }
        }
        statsMap.set(contact.company_id, current);
      });

      const companiesWithStats: CompanyWithStats[] = companies.map((company) => {
        const stats = statsMap.get(company.id) || { count: 0, lastContacted: null };
        return {
          ...company,
          contact_count: stats.count,
          last_contacted_at: stats.lastContacted,
        };
      });

      return {
        data: companiesWithStats,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      };
    },
  });
}

/**
 * Fetch a single company with all its contacts
 */
export function useCompany(id: string) {
  const supabase = createClient();

  return useQuery<CompanyWithStats>({
    queryKey: ["company", id],
    queryFn: async () => {
      const { data: companyData, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      const company = companyData as Company;

      // Get contacts for this company
      const { data: contactsData } = await supabase
        .from("contacts")
        .select("*")
        .eq("company_id", id)
        .order("last_contacted_at", { ascending: false, nullsFirst: false });

      const contacts = contactsData as Contact[] | null;

      // Calculate stats
      const contact_count = contacts?.length || 0;
      const last_contacted_at = contacts?.reduce((latest: string | null, contact) => {
        if (!contact.last_contacted_at) return latest;
        if (!latest || contact.last_contacted_at > latest) {
          return contact.last_contacted_at;
        }
        return latest;
      }, null) || null;

      // Find the most recently contacted person at this company
      const talked_to = contacts?.find(c => c.last_contacted_at) || null;

      return {
        ...company,
        contacts: contacts || [],
        contact_count,
        last_contacted_at,
        talked_to: talked_to ? {
          first_name: talked_to.first_name,
          last_name: talked_to.last_name,
          title: talked_to.title,
          last_contacted_at: talked_to.last_contacted_at,
        } : null,
      } as CompanyWithStats;
    },
    enabled: !!id,
  });
}

/**
 * Get all contacts for a company
 */
export function useCompanyContacts(companyId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["company-contacts", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("company_id", companyId)
        .order("last_contacted_at", { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!companyId,
  });
}

/**
 * Get call history for all contacts at a company
 */
export function useCompanyCallHistory(companyId: string) {
  const supabase = createClient();

  return useQuery<CallWithContact[]>({
    queryKey: ["company-calls", companyId],
    queryFn: async () => {
      // First get all contact IDs for this company
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id")
        .eq("company_id", companyId);

      if (!contacts || contacts.length === 0) {
        return [] as CallWithContact[];
      }

      const contactIds = contacts.map((c) => c.id);

      // Get all calls for these contacts
      const { data: calls, error } = await supabase
        .from("calls")
        .select("*, contacts(id, first_name, last_name, title)")
        .in("contact_id", contactIds)
        .order("started_at", { ascending: false });

      if (error) throw error;
      return (calls || []) as unknown as CallWithContact[];
    },
    enabled: !!companyId,
  });
}

/**
 * Get contacts at the same company as a given contact (for referral context)
 */
export function useCompanyColleagues(contactId: string, companyId?: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["company-colleagues", contactId, companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, title, last_contacted_at, total_calls")
        .eq("company_id", companyId)
        .neq("id", contactId)
        .order("last_contacted_at", { ascending: false, nullsFirst: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });
}

/**
 * Get the "talked to" reference for a company (most recently contacted person)
 */
export function useCompanyTalkedTo(companyId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["company-talked-to", companyId],
    queryFn: async () => {
      // Get the most recently contacted person at this company
      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, title, last_contacted_at")
        .eq("company_id", companyId)
        .not("last_contacted_at", "is", null)
        .order("last_contacted_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
      return data || null;
    },
    enabled: !!companyId,
  });
}

/**
 * Create a new company
 */
export function useCreateCompany() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (company: InsertTables<"companies">) => {
      const { data, error } = await supabase
        .from("companies")
        .insert(company)
        .select()
        .single();
      
      if (error) throw error;
      return data as Company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

/**
 * Update a company
 */
export function useUpdateCompany() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateTables<"companies">;
    }) => {
      const { data, error } = await supabase
        .from("companies")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Company;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["company", data.id] });
    },
  });
}

/**
 * Delete a company (cascades to contacts and all related data)
 */
export function useDeleteCompany() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete the company - CASCADE will delete all contacts and their related data
      const { error } = await supabase
        .from("companies")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

/**
 * Find or create a company by domain
 */
export function useFindOrCreateCompany() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      domain,
      companyData,
    }: {
      userId: string;
      domain: string;
      companyData: Omit<InsertTables<"companies">, "user_id">;
    }) => {
      // Try to find existing company by domain
      const { data: existing } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", userId)
        .eq("domain", domain)
        .single();

      if (existing) {
        return existing as Company;
      }

      // Create new company
      const { data, error } = await supabase
        .from("companies")
        .insert({
          ...companyData,
          user_id: userId,
          domain,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}
