// US State to Timezone mapping
// Uses IANA timezone identifiers

export const US_STATE_TIMEZONES: Record<string, string> = {
  // Eastern Time
  CT: "America/New_York",
  DE: "America/New_York",
  DC: "America/New_York",
  FL: "America/New_York", // Most of FL is Eastern
  GA: "America/New_York",
  IN: "America/Indiana/Indianapolis", // Most of IN is Eastern
  KY: "America/Kentucky/Louisville", // Eastern part
  ME: "America/New_York",
  MD: "America/New_York",
  MA: "America/New_York",
  MI: "America/Detroit",
  NH: "America/New_York",
  NJ: "America/New_York",
  NY: "America/New_York",
  NC: "America/New_York",
  OH: "America/New_York",
  PA: "America/New_York",
  RI: "America/New_York",
  SC: "America/New_York",
  VT: "America/New_York",
  VA: "America/New_York",
  WV: "America/New_York",

  // Central Time
  AL: "America/Chicago",
  AR: "America/Chicago",
  IL: "America/Chicago",
  IA: "America/Chicago",
  KS: "America/Chicago", // Most of KS is Central
  LA: "America/Chicago",
  MN: "America/Chicago",
  MS: "America/Chicago",
  MO: "America/Chicago",
  NE: "America/Chicago", // Most of NE is Central
  ND: "America/Chicago", // Most of ND is Central
  OK: "America/Chicago",
  SD: "America/Chicago", // Most of SD is Central
  TN: "America/Chicago", // Most of TN is Central
  TX: "America/Chicago", // Most of TX is Central
  WI: "America/Chicago",

  // Mountain Time
  AZ: "America/Phoenix", // No DST (except Navajo Nation)
  CO: "America/Denver",
  ID: "America/Boise", // Most of ID is Mountain
  MT: "America/Denver",
  NV: "America/Los_Angeles", // Most populated areas use Pacific
  NM: "America/Denver",
  UT: "America/Denver",
  WY: "America/Denver",

  // Pacific Time
  CA: "America/Los_Angeles",
  OR: "America/Los_Angeles",
  WA: "America/Los_Angeles",

  // Alaska Time
  AK: "America/Anchorage",

  // Hawaii Time
  HI: "America/Honolulu",

  // US Territories
  PR: "America/Puerto_Rico",
  VI: "America/Virgin",
  GU: "Pacific/Guam",
  AS: "Pacific/Pago_Pago",
};

// Full state names mapping
export const US_STATE_NAMES: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  "District of Columbia": "DC",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Puerto Rico": "PR",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
};

// US Area Code to State mapping (covers ~300 area codes)
export const AREA_CODE_TO_STATE: Record<string, string> = {
  // Alabama
  "205": "AL", "251": "AL", "256": "AL", "334": "AL", "938": "AL",
  // Alaska
  "907": "AK",
  // Arizona
  "480": "AZ", "520": "AZ", "602": "AZ", "623": "AZ", "928": "AZ",
  // Arkansas
  "479": "AR", "501": "AR", "870": "AR",
  // California
  "209": "CA", "213": "CA", "310": "CA", "323": "CA", "341": "CA", "408": "CA",
  "415": "CA", "424": "CA", "442": "CA", "510": "CA", "530": "CA", "559": "CA",
  "562": "CA", "619": "CA", "626": "CA", "628": "CA", "650": "CA", "657": "CA",
  "661": "CA", "669": "CA", "707": "CA", "714": "CA", "747": "CA", "760": "CA",
  "805": "CA", "818": "CA", "831": "CA", "858": "CA", "909": "CA", "916": "CA",
  "925": "CA", "949": "CA", "951": "CA",
  // Colorado
  "303": "CO", "719": "CO", "720": "CO", "970": "CO",
  // Connecticut
  "203": "CT", "475": "CT", "860": "CT", "959": "CT",
  // Delaware
  "302": "DE",
  // District of Columbia
  "202": "DC",
  // Florida
  "239": "FL", "305": "FL", "321": "FL", "352": "FL", "386": "FL", "407": "FL",
  "561": "FL", "727": "FL", "754": "FL", "772": "FL", "786": "FL", "813": "FL",
  "850": "FL", "863": "FL", "904": "FL", "941": "FL", "954": "FL",
  // Georgia
  "229": "GA", "404": "GA", "470": "GA", "478": "GA", "678": "GA", "706": "GA",
  "762": "GA", "770": "GA", "912": "GA",
  // Hawaii
  "808": "HI",
  // Idaho
  "208": "ID", "986": "ID",
  // Illinois
  "217": "IL", "224": "IL", "309": "IL", "312": "IL", "331": "IL", "618": "IL",
  "630": "IL", "708": "IL", "773": "IL", "779": "IL", "815": "IL", "847": "IL",
  "872": "IL",
  // Indiana
  "219": "IN", "260": "IN", "317": "IN", "463": "IN", "574": "IN", "765": "IN",
  "812": "IN", "930": "IN",
  // Iowa
  "319": "IA", "515": "IA", "563": "IA", "641": "IA", "712": "IA",
  // Kansas
  "316": "KS", "620": "KS", "785": "KS", "913": "KS",
  // Kentucky
  "270": "KY", "364": "KY", "502": "KY", "606": "KY", "859": "KY",
  // Louisiana
  "225": "LA", "318": "LA", "337": "LA", "504": "LA", "985": "LA",
  // Maine
  "207": "ME",
  // Maryland
  "240": "MD", "301": "MD", "410": "MD", "443": "MD", "667": "MD",
  // Massachusetts
  "339": "MA", "351": "MA", "413": "MA", "508": "MA", "617": "MA", "774": "MA",
  "781": "MA", "857": "MA", "978": "MA",
  // Michigan
  "231": "MI", "248": "MI", "269": "MI", "313": "MI", "517": "MI", "586": "MI",
  "616": "MI", "734": "MI", "810": "MI", "906": "MI", "947": "MI", "989": "MI",
  // Minnesota
  "218": "MN", "320": "MN", "507": "MN", "612": "MN", "651": "MN", "763": "MN",
  "952": "MN",
  // Mississippi
  "228": "MS", "601": "MS", "662": "MS", "769": "MS",
  // Missouri
  "314": "MO", "417": "MO", "573": "MO", "636": "MO", "660": "MO", "816": "MO",
  // Montana
  "406": "MT",
  // Nebraska
  "308": "NE", "402": "NE", "531": "NE",
  // Nevada
  "702": "NV", "725": "NV", "775": "NV",
  // New Hampshire
  "603": "NH",
  // New Jersey
  "201": "NJ", "551": "NJ", "609": "NJ", "732": "NJ", "848": "NJ", "856": "NJ",
  "862": "NJ", "908": "NJ", "973": "NJ",
  // New Mexico
  "505": "NM", "575": "NM",
  // New York
  "212": "NY", "315": "NY", "332": "NY", "347": "NY", "516": "NY", "518": "NY",
  "585": "NY", "607": "NY", "631": "NY", "646": "NY", "680": "NY", "716": "NY",
  "718": "NY", "845": "NY", "914": "NY", "917": "NY", "929": "NY", "934": "NY",
  // North Carolina
  "252": "NC", "336": "NC", "704": "NC", "743": "NC", "828": "NC", "910": "NC",
  "919": "NC", "980": "NC", "984": "NC",
  // North Dakota
  "701": "ND",
  // Ohio
  "216": "OH", "220": "OH", "234": "OH", "330": "OH", "380": "OH", "419": "OH",
  "440": "OH", "513": "OH", "567": "OH", "614": "OH", "740": "OH", "937": "OH",
  // Oklahoma
  "405": "OK", "539": "OK", "580": "OK", "918": "OK",
  // Oregon
  "458": "OR", "503": "OR", "541": "OR", "971": "OR",
  // Pennsylvania
  "215": "PA", "223": "PA", "267": "PA", "272": "PA", "412": "PA", "445": "PA",
  "484": "PA", "570": "PA", "610": "PA", "717": "PA", "724": "PA", "814": "PA",
  "878": "PA",
  // Rhode Island
  "401": "RI",
  // South Carolina
  "803": "SC", "843": "SC", "854": "SC", "864": "SC",
  // South Dakota
  "605": "SD",
  // Tennessee
  "423": "TN", "615": "TN", "629": "TN", "731": "TN", "865": "TN", "901": "TN",
  "931": "TN",
  // Texas
  "210": "TX", "214": "TX", "254": "TX", "281": "TX", "325": "TX", "346": "TX",
  "361": "TX", "409": "TX", "430": "TX", "432": "TX", "469": "TX", "512": "TX",
  "682": "TX", "713": "TX", "726": "TX", "737": "TX", "806": "TX", "817": "TX",
  "830": "TX", "832": "TX", "903": "TX", "915": "TX", "936": "TX", "940": "TX",
  "956": "TX", "972": "TX", "979": "TX",
  // Utah
  "385": "UT", "435": "UT", "801": "UT",
  // Vermont
  "802": "VT",
  // Virginia
  "276": "VA", "434": "VA", "540": "VA", "571": "VA", "703": "VA", "757": "VA",
  "804": "VA",
  // Washington
  "206": "WA", "253": "WA", "360": "WA", "425": "WA", "509": "WA", "564": "WA",
  // West Virginia
  "304": "WV", "681": "WV",
  // Wisconsin
  "262": "WI", "414": "WI", "534": "WI", "608": "WI", "715": "WI", "920": "WI",
  // Wyoming
  "307": "WY",
  // Puerto Rico
  "787": "PR", "939": "PR",
};

/**
 * Get state code from a US phone number based on area code
 * Returns null if area code not found or phone invalid
 */
export function getStateFromPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  // Extract digits only
  const digits = phone.replace(/\D/g, "");
  
  // Need at least 10 digits for a valid US number
  if (digits.length < 10) return null;
  
  // Get area code (skip country code 1 if present)
  const areaCode = digits.startsWith("1") && digits.length >= 11
    ? digits.slice(1, 4)
    : digits.slice(0, 3);
  
  return AREA_CODE_TO_STATE[areaCode] || null;
}

/**
 * Get timezone from location (city, state, country)
 * Defaults to US Eastern if state not found
 */
export function getTimezoneFromLocation(
  city?: string | null,
  state?: string | null,
  country?: string | null
): string {
  // Default to Eastern for US if no state
  if (!state) {
    return "America/New_York";
  }

  // Normalize state - check if it's a full name or abbreviation
  let stateCode = state.toUpperCase().trim();

  // If it's longer than 2 chars, try to find the abbreviation
  if (stateCode.length > 2) {
    const normalized = Object.entries(US_STATE_NAMES).find(
      ([name]) => name.toLowerCase() === state.toLowerCase()
    );
    if (normalized) {
      stateCode = normalized[1];
    }
  }

  return US_STATE_TIMEZONES[stateCode] || "America/New_York";
}

/**
 * Get the current local time in a given timezone
 */
export function getLocalTime(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date());
  } catch {
    // Fallback if timezone is invalid
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date());
  }
}

/**
 * Get timezone abbreviation (e.g., "EST", "PST", "CST", "MST", "HST")
 * Returns standard US abbreviations for common timezones
 */
export function getTimezoneAbbreviation(timezone: string): string {
  // Map IANA timezones to common abbreviations
  // This gives more consistent, recognizable abbreviations
  const abbreviationMap: Record<string, { standard: string; dst: string }> = {
    "America/New_York": { standard: "EST", dst: "EDT" },
    "America/Detroit": { standard: "EST", dst: "EDT" },
    "America/Indiana/Indianapolis": { standard: "EST", dst: "EDT" },
    "America/Kentucky/Louisville": { standard: "EST", dst: "EDT" },
    "America/Chicago": { standard: "CST", dst: "CDT" },
    "America/Denver": { standard: "MST", dst: "MDT" },
    "America/Boise": { standard: "MST", dst: "MDT" },
    "America/Phoenix": { standard: "MST", dst: "MST" }, // Arizona doesn't observe DST
    "America/Los_Angeles": { standard: "PST", dst: "PDT" },
    "America/Anchorage": { standard: "AKST", dst: "AKDT" },
    "America/Honolulu": { standard: "HST", dst: "HST" }, // Hawaii doesn't observe DST
    "America/Puerto_Rico": { standard: "AST", dst: "AST" },
    "Pacific/Guam": { standard: "ChST", dst: "ChST" },
  };

  const mapping = abbreviationMap[timezone];
  if (mapping) {
    // Check if DST is currently active
    const now = new Date();
    const jan = new Date(now.getFullYear(), 0, 1);
    const jul = new Date(now.getFullYear(), 6, 1);
    
    try {
      const janOffset = new Date(jan.toLocaleString("en-US", { timeZone: timezone })).getTime() - jan.getTime();
      const julOffset = new Date(jul.toLocaleString("en-US", { timeZone: timezone })).getTime() - jul.getTime();
      const nowOffset = new Date(now.toLocaleString("en-US", { timeZone: timezone })).getTime() - now.getTime();
      
      // If current offset matches July (summer), it's DST
      const isDST = Math.abs(nowOffset - julOffset) < Math.abs(nowOffset - janOffset);
      return isDST ? mapping.dst : mapping.standard;
    } catch {
      return mapping.standard;
    }
  }

  // Fallback to Intl API for unknown timezones
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
    });
    const parts = formatter.formatToParts(new Date());
    const tzPart = parts.find((part) => part.type === "timeZoneName");
    return tzPart?.value || timezone;
  } catch {
    return timezone;
  }
}

/**
 * Get full timezone display string (e.g., "2:30 PM EST")
 */
export function getTimezoneDisplay(timezone: string): string {
  const time = getLocalTime(timezone);
  const abbr = getTimezoneAbbreviation(timezone);
  return `${time} ${abbr}`;
}

/**
 * Check if it's currently business hours (9 AM - 5 PM) in a timezone
 */
export function isBusinessHours(
  timezone: string,
  startHour: number = 9,
  endHour: number = 17
): boolean {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });
    const hour = parseInt(formatter.format(now), 10);
    return hour >= startHour && hour < endHour;
  } catch {
    return true; // Default to true if we can't determine
  }
}

/**
 * Get a friendly timezone name
 */
export function getFriendlyTimezoneName(timezone: string): string {
  const mapping: Record<string, string> = {
    "America/New_York": "Eastern",
    "America/Chicago": "Central",
    "America/Denver": "Mountain",
    "America/Los_Angeles": "Pacific",
    "America/Phoenix": "Arizona",
    "America/Anchorage": "Alaska",
    "America/Honolulu": "Hawaii",
    "America/Detroit": "Eastern",
    "America/Indiana/Indianapolis": "Eastern (Indiana)",
    "America/Kentucky/Louisville": "Eastern (Kentucky)",
    "America/Boise": "Mountain",
    "America/Puerto_Rico": "Atlantic",
  };

  return mapping[timezone] || timezone.split("/").pop()?.replace(/_/g, " ") || timezone;
}

// =============================================================================
// TIMEZONE GROUP UTILITIES FOR DIALER
// =============================================================================

export type TimezoneGroup = "pacific" | "mountain" | "central" | "eastern" | "alaska" | "hawaii" | "unknown";
export type BusinessHourStatus = "good" | "borderline" | "bad";

/**
 * All timezone groups in order (for UI display)
 */
export const TIMEZONE_GROUPS: TimezoneGroup[] = ["pacific", "mountain", "central", "eastern", "alaska", "hawaii", "unknown"];

/**
 * Map IANA timezone to a timezone group for filtering
 */
export function getTimezoneGroup(timezone: string | null): TimezoneGroup {
  if (!timezone) return "unknown";
  
  // Pacific timezones
  if (timezone.includes("Los_Angeles") || timezone.includes("Pacific")) {
    return "pacific";
  }
  
  // Mountain timezones (includes Arizona, Denver, Boise)
  if (
    timezone.includes("Denver") || 
    timezone.includes("Phoenix") || 
    timezone.includes("Boise") ||
    timezone.includes("Mountain")
  ) {
    return "mountain";
  }
  
  // Central timezones
  if (timezone.includes("Chicago") || timezone.includes("Central")) {
    return "central";
  }
  
  // Eastern timezones (includes Detroit, Indiana, Kentucky)
  if (
    timezone.includes("New_York") || 
    timezone.includes("Detroit") || 
    timezone.includes("Indiana") ||
    timezone.includes("Kentucky") ||
    timezone.includes("Eastern")
  ) {
    return "eastern";
  }
  
  // Alaska timezone
  if (timezone.includes("Anchorage") || timezone.includes("Alaska")) {
    return "alaska";
  }
  
  // Hawaii timezone
  if (timezone.includes("Honolulu") || timezone.includes("Hawaii")) {
    return "hawaii";
  }
  
  return "unknown";
}

/**
 * Get timezone group label for display
 */
export function getTimezoneGroupLabel(group: TimezoneGroup): string {
  const labels: Record<TimezoneGroup, string> = {
    pacific: "Pacific",
    mountain: "Mountain",
    central: "Central",
    eastern: "Eastern",
    alaska: "Alaska",
    hawaii: "Hawaii",
    unknown: "Unknown",
  };
  return labels[group];
}

/**
 * Get short timezone label (PST, MST, CST, EST, AK, HI)
 */
export function getTimezoneGroupShort(group: TimezoneGroup): string {
  const labels: Record<TimezoneGroup, string> = {
    pacific: "PT",
    mountain: "MT",
    central: "CT",
    eastern: "ET",
    alaska: "AK",
    hawaii: "HI",
    unknown: "??",
  };
  return labels[group];
}

/**
 * Get contact's timezone from state or fall back to company timezone
 * Priority: contact.state inference > company.timezone
 */
export function getContactTimezone(
  contact: { state?: string | null },
  company?: { timezone?: string | null } | null
): string | null {
  // First, try to infer from contact's state (more specific)
  if (contact.state) {
    // Normalize state - check if it's a full name or abbreviation
    let stateCode = contact.state.toUpperCase().trim();
    
    // If it's longer than 2 chars, try to find the abbreviation
    if (stateCode.length > 2) {
      const normalized = Object.entries(US_STATE_NAMES).find(
        ([name]) => name.toLowerCase() === contact.state!.toLowerCase()
      );
      if (normalized) {
        stateCode = normalized[1];
      }
    }
    
    const timezone = US_STATE_TIMEZONES[stateCode];
    if (timezone) {
      return timezone;
    }
  }
  
  // Fall back to company timezone
  if (company?.timezone) {
    return company.timezone;
  }
  
  return null; // Unknown timezone
}

/**
 * Get business hour status for a timezone
 * - "good": 9am-5pm (prime calling hours)
 * - "borderline": 8-9am or 5-6pm (acceptable but not ideal)
 * - "bad": outside business hours
 */
export function getBusinessHourStatus(timezone: string | null): BusinessHourStatus {
  if (!timezone) return "bad";
  
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });
    const hour = parseInt(formatter.format(now), 10);
    
    // Good: 9am - 5pm (9-16 in 24h)
    if (hour >= 9 && hour < 17) {
      return "good";
    }
    
    // Borderline: 8-9am or 5-6pm
    if (hour === 8 || hour === 17) {
      return "borderline";
    }
    
    // Bad: outside business hours
    return "bad";
  } catch {
    return "bad";
  }
}

/**
 * Get local time in a timezone formatted for display (e.g., "10:32am")
 */
export function getLocalTimeShort(timezone: string | null): string {
  if (!timezone) return "";
  
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date()).toLowerCase().replace(" ", "");
  } catch {
    return "";
  }
}
