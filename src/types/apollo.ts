export interface ApolloSearchParams {
  q_organization_domains?: string[];
  organization_industry_tag_ids?: string[];
  organization_num_employees_ranges?: string[];
  person_titles?: string[];
  person_locations?: string[];
  page?: number;
  per_page?: number;
}

export interface ApolloPerson {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  title: string;
  email: string;
  email_status: string;
  phone_numbers: ApolloPhoneNumber[];
  linkedin_url: string;
  organization: ApolloOrganization;
  seniority: string;
  departments: string[];
  city: string;
  state: string;
  country: string;
}

export interface ApolloPhoneNumber {
  raw_number: string;
  sanitized_number: string;
  type: string;
  position: number;
  status: string;
  dnc_status: string | null;
  dnc_other_info: string | null;
}

export interface ApolloOrganization {
  id: string;
  name: string;
  website_url: string;
  linkedin_url: string;
  industry: string;
  estimated_num_employees: number;
  annual_revenue: number;
  annual_revenue_printed: string;
  city: string;
  state: string;
  country: string;
  technologies: string[];
}

export interface ApolloSearchResponse {
  people: ApolloPerson[];
  pagination: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

export interface ApolloEnrichRequest {
  email?: string;
  linkedin_url?: string;
  first_name?: string;
  last_name?: string;
  organization_name?: string;
}

export interface ApolloEnrichResponse {
  person: ApolloPerson;
}
