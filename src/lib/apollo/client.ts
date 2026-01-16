import type { ApolloSearchParams, ApolloSearchResponse, ApolloPerson } from "@/types/apollo";

const APOLLO_API_BASE = "https://api.apollo.io/v1";

export async function searchApolloContacts(
  apiKey: string,
  params: ApolloSearchParams
): Promise<ApolloSearchResponse> {
  const response = await fetch(`${APOLLO_API_BASE}/mixed_people/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify({
      api_key: apiKey,
      q_organization_domains: params.q_organization_domains,
      organization_industry_tag_ids: params.organization_industry_tag_ids,
      organization_num_employees_ranges: params.organization_num_employees_ranges,
      person_titles: params.person_titles,
      person_locations: params.person_locations,
      page: params.page || 1,
      per_page: params.per_page || 25,
    }),
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

export function mapApolloToContact(
  person: ApolloPerson,
  userId: string,
  sourceList?: string
) {
  return {
    user_id: userId,
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
    city: person.city || person.organization?.city,
    state: person.state || person.organization?.state,
    country: person.country || person.organization?.country,
    source: "apollo",
    source_list: sourceList,
    stage: "fresh",
    status: "active",
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
