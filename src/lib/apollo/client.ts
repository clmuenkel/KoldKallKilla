import type { ApolloSearchParams, ApolloSearchResponse, ApolloPerson } from "@/types/apollo";
import { getTimezoneFromLocation } from "@/lib/timezone";

const APOLLO_API_BASE = "https://api.apollo.io/v1";

export interface EnhancedSearchParams extends ApolloSearchParams {
  // Intent data filters
  intent_topic_ids?: string[];
  organization_intent_score_min?: number;
  // Always filter to US
  person_locations?: string[];
}

export async function searchApolloContacts(
  apiKey: string,
  params: EnhancedSearchParams
): Promise<ApolloSearchResponse> {
  // Always include US location filter
  const searchParams = {
    api_key: apiKey,
    q_organization_domains: params.q_organization_domains,
    organization_industry_tag_ids: params.organization_industry_tag_ids,
    organization_num_employees_ranges: params.organization_num_employees_ranges,
    person_titles: params.person_titles,
    // Lock to United States
    person_locations: params.person_locations || ["United States"],
    page: params.page || 1,
    per_page: params.per_page || 25,
    // Intent data filters (if provided)
    ...(params.intent_topic_ids?.length && { 
      intent_topic_ids: params.intent_topic_ids 
    }),
    ...(params.organization_intent_score_min && { 
      organization_intent_score_min: params.organization_intent_score_min 
    }),
  };

  const response = await fetch(`${APOLLO_API_BASE}/mixed_people/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify(searchParams),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Apollo API error: ${response.status}`);
  }

  return response.json();
}

export async function enrichApolloContact(
  apiKey: string,
  params: {
    email?: string;
    linkedin_url?: string;
    first_name?: string;
    last_name?: string;
    organization_name?: string;
  }
): Promise<ApolloPerson> {
  const response = await fetch(`${APOLLO_API_BASE}/people/match`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify({
      api_key: apiKey,
      ...params,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Apollo API error: ${response.status}`);
  }

  const data = await response.json();
  return data.person;
}

/**
 * Map Apollo person data to our contact format
 */
export function mapApolloToContact(
  person: ApolloPerson,
  userId: string,
  sourceList?: string,
  companyId?: string
) {
  const city = person.city || person.organization?.city;
  const state = person.state || person.organization?.state;
  const country = person.country || person.organization?.country || "US";

  return {
    user_id: userId,
    company_id: companyId || null,
    apollo_id: person.id,
    enrichment_status: "enriched",
    enriched_at: new Date().toISOString(),
    first_name: person.first_name,
    last_name: person.last_name,
    email: person.email,
    phone: person.phone_numbers?.[0]?.sanitized_number || null,
    mobile: person.phone_numbers?.find((p) => p.type === "mobile")?.sanitized_number || null,
    linkedin_url: person.linkedin_url,
    title: person.title,
    seniority: person.seniority,
    department: person.departments?.[0] || null,
    company_name: person.organization?.name,
    company_domain: person.organization?.website_url?.replace(/^https?:\/\//, "").replace(/\/$/, ""),
    company_linkedin: person.organization?.linkedin_url,
    industry: person.organization?.industry,
    employee_count: person.organization?.estimated_num_employees,
    employee_range: getEmployeeRange(person.organization?.estimated_num_employees),
    annual_revenue: person.organization?.annual_revenue_printed,
    city,
    state,
    country,
    source: "apollo",
    source_list: sourceList,
    stage: "fresh",
    status: "active",
  };
}

/**
 * Map Apollo organization data to our company format
 */
export function mapApolloToCompany(
  person: ApolloPerson,
  userId: string
) {
  const org = person.organization;
  if (!org) return null;

  const city = org.city || person.city;
  const state = org.state || person.state;
  const country = org.country || person.country || "US";
  const timezone = getTimezoneFromLocation(city, state, country);

  const domain = org.website_url?.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return {
    user_id: userId,
    name: org.name,
    domain: domain || null,
    industry: org.industry || null,
    employee_count: org.estimated_num_employees || null,
    employee_range: getEmployeeRange(org.estimated_num_employees),
    city: city || null,
    state: state || null,
    country,
    timezone,
    website: org.website_url || null,
    linkedin_url: org.linkedin_url || null,
    annual_revenue: org.annual_revenue_printed || null,
    // Intent data (if available from Apollo response)
    intent_score: (org as any).intent_score || null,
    intent_topics: (org as any).intent_topics || [],
  };
}

function getEmployeeRange(count?: number): string | null {
  if (!count) return null;
  if (count <= 50) return "1-50";
  if (count <= 200) return "51-200";
  if (count <= 500) return "201-500";
  if (count <= 1000) return "501-1000";
  if (count <= 5000) return "1001-5000";
  return "5001+";
}

// Apollo intent topics for reference
export const APOLLO_INTENT_TOPICS = [
  { id: "healthcare_technology", label: "Healthcare Technology" },
  { id: "financial_services_technology", label: "Financial Services Technology" },
  { id: "cybersecurity", label: "Cybersecurity" },
  { id: "cloud_computing", label: "Cloud Computing" },
  { id: "digital_transformation", label: "Digital Transformation" },
  { id: "data_analytics", label: "Data Analytics" },
  { id: "artificial_intelligence", label: "Artificial Intelligence" },
  { id: "automation", label: "Automation" },
];

// Apollo industry codes for common targets
export const APOLLO_INDUSTRIES = {
  credit_unions: "5b106b751b14890001c7f14c",
  hospitals: "5b106b4a1b148900016adb83",
  healthcare: "5b106b4a1b148900016adb82",
  banking: "5b106b3e1b148900016adb4a",
  financial_services: "5b106b3e1b148900016adb49",
  insurance: "5b106b4a1b148900016adb71",
};
