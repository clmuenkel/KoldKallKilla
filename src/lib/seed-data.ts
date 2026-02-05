// Dummy data for testing the CRM
// This file can be imported and run to seed the database with test data

import { createClient } from "@/lib/supabase/client";
import { DEFAULT_USER_ID } from "@/lib/default-user";
import { getTimezoneFromLocation } from "@/lib/timezone";
import { addBusinessDays, formatDateForDB } from "@/lib/utils";

// Dummy companies
const DUMMY_COMPANIES = [
  {
    name: "First National Credit Union",
    domain: "firstnationalcu.org",
    industry: "credit_union",
    employee_count: 250,
    employee_range: "201-500",
    city: "Denver",
    state: "CO",
    country: "US",
    website: "https://firstnationalcu.org",
    annual_revenue: "$50M - $100M",
    intent_score: 75,
    intent_topics: ["digital_transformation", "cybersecurity"],
  },
  {
    name: "Mountain West Hospital",
    domain: "mountainwesthospital.com",
    industry: "hospital",
    employee_count: 1500,
    employee_range: "1001-5000",
    city: "Salt Lake City",
    state: "UT",
    country: "US",
    website: "https://mountainwesthospital.com",
    annual_revenue: "$100M - $500M",
    intent_score: 82,
    intent_topics: ["healthcare_technology", "data_analytics"],
  },
  {
    name: "Pacific Coast Bank",
    domain: "pacificcoastbank.com",
    industry: "bank",
    employee_count: 800,
    employee_range: "501-1000",
    city: "San Francisco",
    state: "CA",
    country: "US",
    website: "https://pacificcoastbank.com",
    annual_revenue: "$500M - $1B",
    intent_score: 68,
    intent_topics: ["cloud_computing", "automation"],
  },
  {
    name: "Heartland Healthcare Systems",
    domain: "heartlandhealthcare.org",
    industry: "healthcare",
    employee_count: 3200,
    employee_range: "1001-5000",
    city: "Chicago",
    state: "IL",
    country: "US",
    website: "https://heartlandhealthcare.org",
    annual_revenue: "$1B+",
    intent_score: 91,
    intent_topics: ["artificial_intelligence", "healthcare_technology"],
  },
  {
    name: "Sunshine Federal Credit Union",
    domain: "sunshinefcu.com",
    industry: "credit_union",
    employee_count: 120,
    employee_range: "51-200",
    city: "Miami",
    state: "FL",
    country: "US",
    website: "https://sunshinefcu.com",
    annual_revenue: "$25M - $50M",
    intent_score: 55,
    intent_topics: ["digital_transformation"],
  },
];

// Dummy contacts for each company
const DUMMY_CONTACTS_BY_COMPANY: Record<string, Array<{
  first_name: string;
  last_name: string;
  title: string;
  email: string;
  phone: string;
  linkedin_url: string;
  seniority: string;
  department: string;
}>> = {
  "firstnationalcu.org": [
    {
      first_name: "Sarah",
      last_name: "Johnson",
      title: "CFO",
      email: "sjohnson@firstnationalcu.org",
      phone: "+1 (303) 555-0101",
      linkedin_url: "https://linkedin.com/in/sarahjohnson",
      seniority: "c_suite",
      department: "finance",
    },
    {
      first_name: "Michael",
      last_name: "Chen",
      title: "VP of Finance",
      email: "mchen@firstnationalcu.org",
      phone: "+1 (303) 555-0102",
      linkedin_url: "https://linkedin.com/in/michaelchen",
      seniority: "vp",
      department: "finance",
    },
    {
      first_name: "Jessica",
      last_name: "Williams",
      title: "Controller",
      email: "jwilliams@firstnationalcu.org",
      phone: "+1 (303) 555-0103",
      linkedin_url: "https://linkedin.com/in/jessicawilliams",
      seniority: "director",
      department: "finance",
    },
  ],
  "mountainwesthospital.com": [
    {
      first_name: "Robert",
      last_name: "Martinez",
      title: "Chief Financial Officer",
      email: "rmartinez@mountainwesthospital.com",
      phone: "+1 (801) 555-0201",
      linkedin_url: "https://linkedin.com/in/robertmartinez",
      seniority: "c_suite",
      department: "finance",
    },
    {
      first_name: "Emily",
      last_name: "Davis",
      title: "VP of Operations",
      email: "edavis@mountainwesthospital.com",
      phone: "+1 (801) 555-0202",
      linkedin_url: "https://linkedin.com/in/emilydavis",
      seniority: "vp",
      department: "operations",
    },
    {
      first_name: "James",
      last_name: "Wilson",
      title: "Director of IT",
      email: "jwilson@mountainwesthospital.com",
      phone: "+1 (801) 555-0203",
      linkedin_url: "https://linkedin.com/in/jameswilson",
      seniority: "director",
      department: "it",
    },
    {
      first_name: "Amanda",
      last_name: "Brown",
      title: "Finance Director",
      email: "abrown@mountainwesthospital.com",
      phone: "+1 (801) 555-0204",
      linkedin_url: "https://linkedin.com/in/amandabrown",
      seniority: "director",
      department: "finance",
    },
  ],
  "pacificcoastbank.com": [
    {
      first_name: "David",
      last_name: "Lee",
      title: "CEO",
      email: "dlee@pacificcoastbank.com",
      phone: "+1 (415) 555-0301",
      linkedin_url: "https://linkedin.com/in/davidlee",
      seniority: "c_suite",
      department: "executive",
    },
    {
      first_name: "Lisa",
      last_name: "Taylor",
      title: "CFO",
      email: "ltaylor@pacificcoastbank.com",
      phone: "+1 (415) 555-0302",
      linkedin_url: "https://linkedin.com/in/lisataylor",
      seniority: "c_suite",
      department: "finance",
    },
    {
      first_name: "Kevin",
      last_name: "Nguyen",
      title: "VP of Technology",
      email: "knguyen@pacificcoastbank.com",
      phone: "+1 (415) 555-0303",
      linkedin_url: "https://linkedin.com/in/kevinnguyen",
      seniority: "vp",
      department: "it",
    },
  ],
  "heartlandhealthcare.org": [
    {
      first_name: "Patricia",
      last_name: "Anderson",
      title: "Chief Operating Officer",
      email: "panderson@heartlandhealthcare.org",
      phone: "+1 (312) 555-0401",
      linkedin_url: "https://linkedin.com/in/patriciaanderson",
      seniority: "c_suite",
      department: "operations",
    },
    {
      first_name: "Thomas",
      last_name: "Garcia",
      title: "VP of Finance",
      email: "tgarcia@heartlandhealthcare.org",
      phone: "+1 (312) 555-0402",
      linkedin_url: "https://linkedin.com/in/thomasgarcia",
      seniority: "vp",
      department: "finance",
    },
    {
      first_name: "Jennifer",
      last_name: "Moore",
      title: "CIO",
      email: "jmoore@heartlandhealthcare.org",
      phone: "+1 (312) 555-0403",
      linkedin_url: "https://linkedin.com/in/jennifermoore",
      seniority: "c_suite",
      department: "it",
    },
    {
      first_name: "Christopher",
      last_name: "White",
      title: "Director of Procurement",
      email: "cwhite@heartlandhealthcare.org",
      phone: "+1 (312) 555-0404",
      linkedin_url: "https://linkedin.com/in/christopherwhite",
      seniority: "director",
      department: "operations",
    },
    {
      first_name: "Michelle",
      last_name: "Harris",
      title: "Treasurer",
      email: "mharris@heartlandhealthcare.org",
      phone: "+1 (312) 555-0405",
      linkedin_url: "https://linkedin.com/in/michelleharris",
      seniority: "director",
      department: "finance",
    },
  ],
  "sunshinefcu.com": [
    {
      first_name: "Brian",
      last_name: "Thompson",
      title: "President & CEO",
      email: "bthompson@sunshinefcu.com",
      phone: "+1 (305) 555-0501",
      linkedin_url: "https://linkedin.com/in/brianthompson",
      seniority: "c_suite",
      department: "executive",
    },
    {
      first_name: "Maria",
      last_name: "Rodriguez",
      title: "CFO",
      email: "mrodriguez@sunshinefcu.com",
      phone: "+1 (305) 555-0502",
      linkedin_url: "https://linkedin.com/in/mariarodriguez",
      seniority: "c_suite",
      department: "finance",
    },
  ],
};

export async function seedDummyData() {
  const supabase = createClient();
  const userId = DEFAULT_USER_ID;
  
  const results = {
    companies: 0,
    contacts: 0,
    calls: 0,
    tasks: 0,
    errors: [] as string[],
  };

  try {
    // 1. Create companies
    for (const companyData of DUMMY_COMPANIES) {
      const timezone = getTimezoneFromLocation(
        companyData.city,
        companyData.state,
        companyData.country
      );

      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert({
          user_id: userId,
          ...companyData,
          timezone,
        })
        .select()
        .single();

      if (companyError) {
        results.errors.push(`Company ${companyData.name}: ${companyError.message}`);
        continue;
      }

      results.companies++;

      // 2. Create contacts for this company
      const contactsData = DUMMY_CONTACTS_BY_COMPANY[companyData.domain] || [];
      
      for (const contactData of contactsData) {
        const { data: contact, error: contactError } = await supabase
          .from("contacts")
          .insert({
            user_id: userId,
            company_id: company.id,
            ...contactData,
            company_name: companyData.name,
            company_domain: companyData.domain,
            industry: companyData.industry,
            employee_count: companyData.employee_count,
            employee_range: companyData.employee_range,
            city: companyData.city,
            state: companyData.state,
            country: companyData.country,
            source: "seed_data",
            stage: "fresh",
            status: "active",
          })
          .select()
          .single();

        if (contactError) {
          results.errors.push(`Contact ${contactData.first_name}: ${contactError.message}`);
          continue;
        }

        results.contacts++;

        // 3. Add a call for some contacts (randomly)
        if (Math.random() > 0.5) {
          const outcomes = ["connected", "voicemail", "no_answer"];
          const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
          
          const startedAt = new Date();
          startedAt.setDate(startedAt.getDate() - Math.floor(Math.random() * 14)); // Random day in last 2 weeks
          
          const durationSeconds = outcome === "connected" 
            ? Math.floor(Math.random() * 300) + 60 // 1-6 minutes if connected
            : Math.floor(Math.random() * 30); // 0-30 seconds otherwise

          const endedAt = new Date(startedAt.getTime() + durationSeconds * 1000);

          const { error: callError } = await supabase
            .from("calls")
            .insert({
              user_id: userId,
              contact_id: contact.id,
              started_at: startedAt.toISOString(),
              ended_at: endedAt.toISOString(),
              duration_seconds: durationSeconds,
              outcome,
              notes: outcome === "connected" 
                ? "Had a good conversation. They're interested in learning more." 
                : outcome === "voicemail" 
                  ? "Left voicemail with brief intro." 
                  : null,
              timestamped_notes: outcome === "connected" ? [
                { time: "00:15", note: "Intro - mentioned referral" },
                { time: "01:30", note: "Discussed current challenges" },
                { time: "03:00", note: "Showed interest in demo" },
              ] : [],
            });

          if (!callError) {
            results.calls++;
            
            // Update contact's last_contacted_at
            await supabase
              .from("contacts")
              .update({ 
                last_contacted_at: startedAt.toISOString(),
                stage: outcome === "connected" ? "contacted" : "fresh",
              })
              .eq("id", contact.id);
          }
        }

        // 4. Add tasks for some contacts
        if (Math.random() > 0.6) {
          const taskTypes = ["call", "email", "follow_up"];
          // Random 1-5 business days from today
          const dueDate = addBusinessDays(new Date(), 1 + Math.floor(Math.random() * 5));

          const { error: taskError } = await supabase
            .from("tasks")
            .insert({
              user_id: userId,
              contact_id: contact.id,
              title: `Follow up with ${contactData.first_name}`,
              type: taskTypes[Math.floor(Math.random() * taskTypes.length)],
              priority: "medium",
              status: "pending",
              due_date: formatDateForDB(dueDate),
            });

          if (!taskError) {
            results.tasks++;
          }
        }
      }
    }

    // 5. Create some persona sets
    const personaSets = [
      {
        user_id: userId,
        name: "Finance Leaders - Healthcare",
        titles: ["CFO", "VP of Finance", "Controller", "Treasurer"],
        industries: ["hospital", "healthcare"],
        employee_ranges: ["1001-5000", "5001+"],
        include_intent_data: true,
        is_default: true,
      },
      {
        user_id: userId,
        name: "Finance Leaders - Credit Unions",
        titles: ["CFO", "VP of Finance", "Controller"],
        industries: ["credit_union"],
        employee_ranges: ["51-200", "201-500", "501-1000"],
        include_intent_data: false,
        is_default: false,
      },
    ];

    for (const personaSet of personaSets) {
      await supabase.from("persona_sets").insert(personaSet);
    }

    return results;
  } catch (error: any) {
    results.errors.push(`Unexpected error: ${error.message}`);
    return results;
  }
}

export async function clearDummyData() {
  const supabase = createClient();
  const userId = DEFAULT_USER_ID;

  // Delete in order to avoid FK constraints
  await supabase.from("tasks").delete().eq("user_id", userId);
  await supabase.from("calls").delete().eq("user_id", userId);
  await supabase.from("notes").delete().eq("user_id", userId);
  await supabase.from("contacts").delete().eq("user_id", userId);
  await supabase.from("companies").delete().eq("user_id", userId);
  await supabase.from("persona_sets").delete().eq("user_id", userId);

  return { success: true };
}
