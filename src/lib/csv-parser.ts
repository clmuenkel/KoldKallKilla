/**
 * CSV Parser for importing contacts from spreadsheets
 * Handles multi-line quoted fields, row deduplication, and field mapping
 * Supports multiple CSV templates: Legacy (CX Call List) and Apollo Export
 */

import type { InsertTables } from "@/types/database";
import { getTimezoneFromLocation, getStateFromPhone } from "@/lib/timezone";

// CSV template types
export type CSVTemplate = "legacy" | "apollo";

// Parsed row from CSV (raw string values)
export interface ParsedCSVRow {
  lastName: string;
  firstName: string;
  company: string;
  linkedinUrl: string;
  type: string; // Industry
  companyInfo: string; // State
  companyHeadcount: string;
  timeZone: string;
  mobile: string;
  direct: string;
  email: string;
  position: string;
  personalConnector: string;
  answered: string;
  notes: string;
  city: string; // For Apollo imports
  // Original row index for debugging
  _rowIndex?: number;
  // Template used for parsing
  _template?: CSVTemplate;
}

// Timezone abbreviation to IANA mapping
const TIMEZONE_ABBR_MAP: Record<string, string> = {
  EST: "America/New_York",
  EDT: "America/New_York",
  CST: "America/Chicago",
  CDT: "America/Chicago",
  MST: "America/Denver",
  MDT: "America/Denver",
  PST: "America/Los_Angeles",
  PDT: "America/Los_Angeles",
  MT: "America/Denver",
  PT: "America/Los_Angeles",
  ET: "America/New_York",
  CT: "America/Chicago",
  AKST: "America/Anchorage",
  AKDT: "America/Anchorage",
  HST: "America/Honolulu",
};

/**
 * Parse CSV text into array of rows
 * Handles quoted fields with embedded newlines and commas
 */
export function parseCSV(csvText: string): ParsedCSVRow[] {
  const rows: ParsedCSVRow[] = [];
  const lines: string[] = [];
  
  // Normalize line endings (handle \r\n, \r, \n)
  const normalizedText = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  
  // Parse CSV properly handling quoted fields with newlines
  let currentLine = "";
  let inQuotes = false;
  
  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText[i];
    
    if (char === '"') {
      // Handle escaped quotes ("")
      if (normalizedText[i + 1] === '"') {
        currentLine += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
        currentLine += char;
      }
    } else if (char === "\n" && !inQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = "";
    } else {
      currentLine += char;
    }
  }
  
  // Don't forget the last line
  if (currentLine.trim()) {
    lines.push(currentLine);
  }
  
  console.log(`[CSV Parser] Parsed ${lines.length} lines from CSV`);
  
  // Skip header row
  if (lines.length === 0) {
    console.log("[CSV Parser] No lines found in CSV");
    return [];
  }
  
  // Log header for debugging
  console.log("[CSV Parser] Header:", lines[0].substring(0, 100) + "...");
  
  // Parse each line into fields
  for (let rowIndex = 1; rowIndex < lines.length; rowIndex++) {
    const line = lines[rowIndex];
    const fields = parseCSVLine(line);
    
    // Map fields to ParsedCSVRow
    // Column order: Last Name, First Name, Company, Link, Type, Company Info, 
    // Company Headcount, Time Zone, Mobile, Direct, Email, Position, 
    // Personal Connector + Bio, Answered, Last Email Sent Date, Email Notes,
    // Last Email Sent Date (dup), Notes, Start, Day X columns...
    
    const row: ParsedCSVRow = {
      lastName: cleanField(fields[0]),
      firstName: cleanField(fields[1]),
      company: cleanField(fields[2]),
      linkedinUrl: cleanField(fields[3]),
      type: cleanField(fields[4]),
      companyInfo: cleanField(fields[5]),
      companyHeadcount: cleanField(fields[6]),
      timeZone: cleanField(fields[7]),
      mobile: cleanField(fields[8]),
      direct: cleanField(fields[9]),
      email: cleanField(fields[10]),
      position: cleanField(fields[11]),
      personalConnector: cleanField(fields[12]),
      answered: cleanField(fields[13]),
      notes: cleanField(fields[17]), // Notes is at index 17
      _rowIndex: rowIndex,
    };
    
    // Only add rows that have at least a name
    if (row.firstName || row.lastName) {
      rows.push(row);
    }
  }
  
  console.log(`[CSV Parser] Parsed ${rows.length} valid contacts`);
  if (rows.length > 0) {
    console.log("[CSV Parser] First contact:", rows[0]);
  }
  
  return rows;
}

/**
 * Parse Apollo CSV export (header-based mapping)
 * Apollo headers: First Name, Last Name, Title, Company Name, Email, Work Direct Phone, 
 * Home Phone, Mobile Phone, Other Phone, # Employees, Industry, Person Linkedin Url, 
 * Website, City, State, etc.
 */
export function parseApolloCSV(csvText: string): ParsedCSVRow[] {
  const rows: ParsedCSVRow[] = [];
  const lines: string[] = [];
  
  // Normalize line endings
  const normalizedText = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  
  // Parse CSV handling quoted fields with newlines
  let currentLine = "";
  let inQuotes = false;
  
  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText[i];
    
    if (char === '"') {
      if (normalizedText[i + 1] === '"') {
        currentLine += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
        currentLine += char;
      }
    } else if (char === "\n" && !inQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = "";
    } else {
      currentLine += char;
    }
  }
  
  if (currentLine.trim()) {
    lines.push(currentLine);
  }
  
  console.log(`[Apollo CSV Parser] Parsed ${lines.length} lines from CSV`);
  
  if (lines.length === 0) {
    console.log("[Apollo CSV Parser] No lines found in CSV");
    return [];
  }
  
  // Parse header row to build column index map
  const headerFields = parseCSVLine(lines[0]);
  const headerIndex: Record<string, number> = {};
  
  headerFields.forEach((header, index) => {
    // Normalize header names (trim, lowercase for matching)
    const normalizedHeader = header.trim();
    headerIndex[normalizedHeader] = index;
  });
  
  console.log("[Apollo CSV Parser] Headers found:", Object.keys(headerIndex).slice(0, 15).join(", "));
  
  // Helper to get field by header name (case-insensitive matching)
  const getField = (fields: string[], ...headerNames: string[]): string => {
    for (const name of headerNames) {
      // Try exact match first
      if (headerIndex[name] !== undefined) {
        return cleanField(fields[headerIndex[name]]);
      }
      // Try case-insensitive match
      const lowerName = name.toLowerCase();
      for (const [header, idx] of Object.entries(headerIndex)) {
        if (header.toLowerCase() === lowerName) {
          return cleanField(fields[idx]);
        }
      }
    }
    return "";
  };
  
  // Parse each data row
  for (let rowIndex = 1; rowIndex < lines.length; rowIndex++) {
    const fields = parseCSVLine(lines[rowIndex]);
    
    // Get phone with priority: Mobile Phone is primary for contacts.mobile
    // Other Phone > Work Direct Phone > Home Phone for contacts.phone (stored in direct)
    const mobilePhone = getField(fields, "Mobile Phone");
    const otherPhone = getField(fields, "Other Phone");
    const workDirectPhone = getField(fields, "Work Direct Phone");
    const homePhone = getField(fields, "Home Phone");
    
    // Direct = Other Phone, fallback to Work Direct, fallback to Home
    const directPhone = otherPhone || workDirectPhone || homePhone;
    
    const row: ParsedCSVRow = {
      firstName: getField(fields, "First Name"),
      lastName: getField(fields, "Last Name"),
      company: getField(fields, "Company Name", "Company"),
      linkedinUrl: getField(fields, "Person Linkedin Url", "LinkedIn URL", "Linkedin Url"),
      type: getField(fields, "Industry"),
      companyInfo: getField(fields, "State"), // State goes into companyInfo for compatibility
      companyHeadcount: getField(fields, "# Employees", "Employees", "Company Headcount"),
      timeZone: "", // Apollo doesn't have timezone - leave empty, don't default
      mobile: mobilePhone,
      direct: directPhone,
      email: getField(fields, "Email"),
      position: getField(fields, "Title", "Position"),
      personalConnector: "", // Apollo doesn't have this
      answered: "", // Apollo doesn't have this
      notes: "", // Apollo doesn't have notes
      city: getField(fields, "City"),
      _rowIndex: rowIndex,
      _template: "apollo",
    };
    
    // Only add rows that have at least a name
    if (row.firstName || row.lastName) {
      rows.push(row);
    }
  }
  
  console.log(`[Apollo CSV Parser] Parsed ${rows.length} valid contacts`);
  if (rows.length > 0) {
    console.log("[Apollo CSV Parser] First contact:", rows[0]);
  }
  
  return rows;
}

/**
 * Parse CSV by template type
 */
export function parseCSVByTemplate(csvText: string, template: CSVTemplate): ParsedCSVRow[] {
  if (template === "apollo") {
    return parseApolloCSV(csvText);
  }
  return parseCSV(csvText);
}

/**
 * Parse a single CSV line into fields
 * Handles quoted fields with commas and escaped quotes
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(currentField);
      currentField = "";
    } else {
      currentField += char;
    }
  }
  
  // Add the last field
  fields.push(currentField);
  
  return fields;
}

/**
 * Clean a field value - trim, remove leading/trailing newlines
 */
function cleanField(value: string | undefined): string {
  if (!value) return "";
  return value
    .replace(/^[\s\n\r]+|[\s\n\r]+$/g, "") // Trim whitespace and newlines
    .replace(/\n/g, " ") // Replace internal newlines with spaces
    .trim();
}

/**
 * Deduplicate rows - keep only rows with non-empty LinkedIn URL
 * When same person appears twice (one with Link, one without), keep the one with Link
 */
export function dedupeByLink(rows: ParsedCSVRow[]): ParsedCSVRow[] {
  // Group by (firstName + lastName + company) key
  const groups = new Map<string, ParsedCSVRow[]>();
  
  for (const row of rows) {
    const key = `${row.firstName.toLowerCase()}|${row.lastName.toLowerCase()}|${row.company.toLowerCase()}`;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  }
  
  // For each group, prefer the row with a LinkedIn URL
  const dedupedRows: ParsedCSVRow[] = [];
  
  for (const groupRows of groups.values()) {
    if (groupRows.length === 1) {
      dedupedRows.push(groupRows[0]);
    } else {
      // Find row with LinkedIn URL
      const withLink = groupRows.find(r => r.linkedinUrl.length > 0);
      if (withLink) {
        // Merge any additional data from other rows
        const merged = mergeRows(withLink, groupRows.filter(r => r !== withLink));
        dedupedRows.push(merged);
      } else {
        // No LinkedIn URL in any row, keep first
        dedupedRows.push(groupRows[0]);
      }
    }
  }
  
  return dedupedRows;
}

/**
 * Statistics from state inference
 */
export interface InferenceStats {
  fromCompany: number;
  fromPhone: number;
  noInference: number;
}

/**
 * Infer missing state data for contacts to enable timezone derivation
 * Strategy:
 * 1. For contacts missing state, use the most common state from other contacts at the same company
 * 2. If no company data available, try to derive state from phone area code
 */
export function inferMissingStates(rows: ParsedCSVRow[]): {
  rows: ParsedCSVRow[];
  stats: InferenceStats;
} {
  const stats: InferenceStats = { fromCompany: 0, fromPhone: 0, noInference: 0 };
  
  // Step 1: Build a map of company -> most common state
  const companyStateFrequency = new Map<string, Map<string, number>>();
  
  for (const row of rows) {
    if (!row.company || !row.companyInfo) continue; // Need both company and state
    
    const companyKey = row.company.toLowerCase().trim();
    const state = row.companyInfo.trim();
    
    if (!companyStateFrequency.has(companyKey)) {
      companyStateFrequency.set(companyKey, new Map());
    }
    
    const stateMap = companyStateFrequency.get(companyKey)!;
    stateMap.set(state, (stateMap.get(state) || 0) + 1);
  }
  
  // Step 2: For each company, determine the most common state
  const mostCommonStateByCompany = new Map<string, string>();
  
  for (const [companyKey, stateMap] of companyStateFrequency.entries()) {
    let maxCount = 0;
    let mostCommonState = "";
    
    for (const [state, count] of stateMap.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonState = state;
      }
    }
    
    if (mostCommonState) {
      mostCommonStateByCompany.set(companyKey, mostCommonState);
    }
  }
  
  console.log(`[State Inference] Found states for ${mostCommonStateByCompany.size} companies`);
  
  // Step 3: For each contact missing state, try to infer it
  for (const row of rows) {
    // Skip if already has state
    if (row.companyInfo && row.companyInfo.trim()) {
      continue;
    }
    
    // Try 1: Use most common state from same company
    if (row.company) {
      const companyKey = row.company.toLowerCase().trim();
      const companyState = mostCommonStateByCompany.get(companyKey);
      
      if (companyState) {
        row.companyInfo = companyState;
        stats.fromCompany++;
        continue;
      }
    }
    
    // Try 2: Derive state from phone area code
    const phone = row.mobile || row.direct;
    if (phone) {
      const phoneState = getStateFromPhone(phone);
      if (phoneState) {
        row.companyInfo = phoneState;
        stats.fromPhone++;
        continue;
      }
    }
    
    // No inference possible
    stats.noInference++;
  }
  
  console.log(`[State Inference] Inferred: ${stats.fromCompany} from company, ${stats.fromPhone} from phone, ${stats.noInference} no inference`);
  
  return { rows, stats };
}

/**
 * Merge data from additional rows into the primary row
 * Fills in blank fields from other rows
 */
function mergeRows(primary: ParsedCSVRow, others: ParsedCSVRow[]): ParsedCSVRow {
  const merged = { ...primary };
  
  for (const other of others) {
    // Fill in any blank fields from other rows
    if (!merged.mobile && other.mobile) merged.mobile = other.mobile;
    if (!merged.direct && other.direct) merged.direct = other.direct;
    if (!merged.email && other.email) merged.email = other.email;
    if (!merged.personalConnector && other.personalConnector) merged.personalConnector = other.personalConnector;
    if (!merged.notes && other.notes) merged.notes = other.notes;
  }
  
  return merged;
}

/**
 * Extract domain from email address
 */
export function extractDomain(email: string): string | null {
  if (!email) return null;
  
  const cleaned = email.trim().toLowerCase();
  const atIndex = cleaned.lastIndexOf("@");
  
  if (atIndex === -1 || atIndex === cleaned.length - 1) return null;
  
  const domain = cleaned.substring(atIndex + 1);
  
  // Filter out common personal email domains
  const personalDomains = [
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
    "aol.com", "icloud.com", "mail.com", "protonmail.com",
    "live.com", "msn.com", "me.com"
  ];
  
  if (personalDomains.includes(domain)) {
    return null;
  }
  
  return domain;
}

/**
 * Map timezone abbreviation to IANA timezone
 */
export function mapTimezone(abbr: string): string {
  if (!abbr) return "America/New_York"; // Default to Eastern
  
  const normalized = abbr.toUpperCase().trim();
  return TIMEZONE_ABBR_MAP[normalized] || "America/New_York";
}

/**
 * Normalize employee range to match CRM format
 */
function normalizeEmployeeRange(headcount: string): string | null {
  if (!headcount) return null;
  
  // Common formats: "5K-10K employees", "1K-5K employees", "201-500 employees", "501-1K employees"
  const cleaned = headcount.toLowerCase().replace(/employees?/gi, "").trim();
  
  // Map to standardized ranges
  const rangeMap: Record<string, string> = {
    "1-10": "1-10",
    "11-50": "11-50",
    "51-200": "51-200",
    "201-500": "201-500",
    "501-1k": "501-1000",
    "501-1000": "501-1000",
    "1k-5k": "1001-5000",
    "1001-5000": "1001-5000",
    "5k-10k": "5001-10000",
    "5001-10000": "5001-10000",
    "10k+": "10001+",
    "10001+": "10001+",
  };
  
  return rangeMap[cleaned] || headcount;
}

/**
 * Map parsed CSV row to contact insert data
 */
export function mapToContact(
  row: ParsedCSVRow,
  userId: string,
  companyId?: string
): InsertTables<"contacts"> {
  const domain = extractDomain(row.email);
  const isApollo = row._template === "apollo";
  
  return {
    user_id: userId,
    company_id: companyId || null,
    first_name: row.firstName,
    last_name: row.lastName || null,
    email: row.email || null,
    phone: row.direct || null, // Direct/Other → contacts.phone (secondary dial number)
    mobile: row.mobile || null, // Mobile → contacts.mobile (primary dial number)
    linkedin_url: row.linkedinUrl || null,
    title: row.position || null,
    company_name: row.company || null,
    company_domain: domain,
    industry: row.type || null,
    city: row.city || null, // City for Apollo imports
    state: row.companyInfo || null, // Company Info / State
    employee_range: normalizeEmployeeRange(row.companyHeadcount),
    source: isApollo ? "apollo_import" : "csv_import",
    source_list: isApollo ? "Apollo Export" : "CX Call List",
    stage: "fresh",
    status: "active",
    direct_referral_note: row.personalConnector || null,
    tags: row.answered?.toLowerCase() === "yes" ? ["answered"] : [],
    lead_score: 0,
    total_calls: 0,
    total_emails: 0,
  };
}

/**
 * Map parsed CSV row to company insert data
 * Sets timezone from CSV timeZone field (legacy) or derives from location (city/state)
 */
export function mapToCompany(
  row: ParsedCSVRow,
  userId: string,
  domain: string | null
): InsertTables<"companies"> | null {
  if (!row.company) return null;
  
  // For legacy imports, use the timezone from the CSV if provided
  const csvTimezone = row.timeZone ? mapTimezone(row.timeZone) : null;
  
  // Derive timezone from location when city or state is present
  const locationTimezone = (row.city || row.companyInfo) 
    ? getTimezoneFromLocation(row.city || null, row.companyInfo || null, "USA") 
    : null;
  
  // Use CSV timezone if provided, otherwise use location-derived timezone
  const timezone = csvTimezone ?? locationTimezone;
  
  return {
    user_id: userId,
    name: row.company,
    domain: domain,
    industry: row.type || null,
    city: row.city || null,
    state: row.companyInfo || null,
    employee_range: normalizeEmployeeRange(row.companyHeadcount),
    timezone: timezone,
    country: "USA",
  };
}

/**
 * Parse and prepare CSV data for import
 * Returns deduped, mapped rows ready for database insertion
 */
export function prepareImport(csvText: string): {
  rows: ParsedCSVRow[];
  stats: {
    totalRows: number;
    afterDedupe: number;
    duplicatesRemoved: number;
  };
} {
  const allRows = parseCSV(csvText);
  const dedupedRows = dedupeByLink(allRows);
  
  return {
    rows: dedupedRows,
    stats: {
      totalRows: allRows.length,
      afterDedupe: dedupedRows.length,
      duplicatesRemoved: allRows.length - dedupedRows.length,
    },
  };
}
