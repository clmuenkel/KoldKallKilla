export const STAGES = [
  { value: "fresh", label: "Fresh", color: "bg-slate-500" },
  { value: "contacted", label: "Contacted", color: "bg-blue-500" },
  { value: "qualified", label: "Qualified", color: "bg-yellow-500" },
  { value: "meeting", label: "Meeting", color: "bg-purple-500" },
  { value: "proposal", label: "Proposal", color: "bg-orange-500" },
  { value: "won", label: "Won", color: "bg-green-500" },
  { value: "lost", label: "Lost", color: "bg-red-500" },
] as const;

export const CALL_OUTCOMES = [
  { value: "connected", label: "Connected", icon: "✅" },
  { value: "voicemail", label: "Voicemail", icon: "📧" },
  { value: "no_answer", label: "No Answer", icon: "📵" },
  { value: "busy", label: "Busy", icon: "🔴" },
  { value: "wrong_number", label: "Wrong Number", icon: "❌" },
  { value: "gatekeeper", label: "Gatekeeper", icon: "🚫" },
] as const;

export const CALL_DISPOSITIONS = [
  { value: "interested_meeting", label: "Interested - Book Meeting" },
  { value: "interested_info", label: "Interested - Send Info" },
  { value: "callback", label: "Callback Requested" },
  { value: "not_interested_fit", label: "Not Interested - Bad Fit" },
  { value: "not_interested_solution", label: "Not Interested - Has Solution" },
  { value: "not_interested_budget", label: "Not Interested - No Budget" },
  { value: "do_not_contact", label: "Do Not Contact" },
] as const;

export const TASK_TYPES = [
  { value: "call", label: "Call", icon: "📞" },
  { value: "email", label: "Email", icon: "✉️" },
  { value: "follow_up", label: "Follow Up", icon: "🔄" },
  { value: "meeting_prep", label: "Meeting Prep", icon: "📋" },
  { value: "proposal", label: "Proposal", icon: "📝" },
  { value: "other", label: "Other", icon: "📌" },
] as const;

export const TASK_PRIORITIES = [
  { value: "low", label: "Low", color: "text-muted-foreground" },
  { value: "medium", label: "Medium", color: "text-yellow-500" },
  { value: "high", label: "High", color: "text-orange-500" },
  { value: "urgent", label: "Urgent", color: "text-red-500" },
] as const;

export const INDUSTRIES = [
  { value: "credit_union", label: "Credit Union" },
  { value: "hospital", label: "Hospital" },
  { value: "bank", label: "Bank" },
  { value: "healthcare", label: "Healthcare" },
  { value: "financial_services", label: "Financial Services" },
] as const;

export const EMPLOYEE_RANGES = [
  { value: "1-50", label: "1-50" },
  { value: "51-200", label: "51-200" },
  { value: "201-500", label: "201-500" },
  { value: "501-1000", label: "501-1,000" },
  { value: "1001-5000", label: "1,001-5,000" },
  { value: "5001+", label: "5,001+" },
] as const;

export const EMAIL_TEMPLATE_CATEGORIES = [
  { value: "initial_outreach", label: "Initial Outreach" },
  { value: "meeting", label: "Meeting" },
  { value: "follow_up", label: "Follow Up" },
  { value: "nurture", label: "Nurture" },
  { value: "closing", label: "Closing" },
] as const;

export const TEMPLATE_VARIABLES = [
  { key: "first_name", label: "First Name", example: "John" },
  { key: "last_name", label: "Last Name", example: "Smith" },
  { key: "full_name", label: "Full Name", example: "John Smith" },
  { key: "company", label: "Company", example: "Acme Corp" },
  { key: "title", label: "Title", example: "VP of Finance" },
  { key: "email", label: "Email", example: "john@acme.com" },
  { key: "phone", label: "Phone", example: "(555) 123-4567" },
  { key: "sender_name", label: "Your Name", example: "Your Name" },
  { key: "sender_calendar", label: "Calendar Link", example: "https://calendly.com/..." },
  { key: "meeting_date", label: "Meeting Date", example: "Tuesday, January 20th" },
  { key: "meeting_time", label: "Meeting Time", example: "2:00 PM EST" },
] as const;
