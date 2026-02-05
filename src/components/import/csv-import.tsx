"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_USER_ID } from "@/lib/default-user";
import {
  parseCSVByTemplate,
  dedupeByLink,
  inferMissingStates,
  extractDomain,
  mapToContact,
  mapToCompany,
  type ParsedCSVRow,
  type CSVTemplate,
  type InferenceStats,
} from "@/lib/csv-parser";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  Building2,
  Users,
  AlertCircle,
  X,
  Phone,
  Calendar,
  Clock,
} from "lucide-react";

type ImportStep = "upload" | "preview" | "importing" | "done" | "scheduling";

interface ImportStats {
  created: number;
  updated: number;
  companiesCreated: number;
  failed: number;
  notesCreated: number;
}

interface FailedImport {
  row: ParsedCSVRow;
  type: "contact" | "company";
  error: string;
  errorCode?: string;
}

// Map Supabase error codes to friendly messages
function getFriendlyErrorMessage(error: string, code?: string): string {
  if (code === "23505") return "Duplicate entry - this record already exists";
  if (code === "23503") return "Referenced record not found";
  if (code === "23502") return "Required field is missing";
  if (error.includes("duplicate")) return "Duplicate entry";
  if (error.includes("null value")) return "Required field is missing";
  return error;
}

export function CSVImport() {
  const [step, setStep] = useState<ImportStep>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [listName, setListName] = useState<string>("");
  const [csvTemplate, setCsvTemplate] = useState<CSVTemplate>("apollo"); // Default to Apollo
  
  // Parsed data
  const [parsedRows, setParsedRows] = useState<ParsedCSVRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [parseStats, setParseStats] = useState({ totalRows: 0, afterDedupe: 0, duplicatesRemoved: 0 });
  const [inferenceStats, setInferenceStats] = useState<InferenceStats | null>(null);
  
  // Import progress
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState<ImportStats>({
    created: 0,
    updated: 0,
    companiesCreated: 0,
    failed: 0,
    notesCreated: 0,
  });
  const [failedImports, setFailedImports] = useState<FailedImport[]>([]);
  const [showFailedDialog, setShowFailedDialog] = useState(false);
  
  // Scheduling state
  const [importedContactIds, setImportedContactIds] = useState<string[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleResult, setScheduleResult] = useState<{
    scheduled: number;
    distribution: { date: string; count: number }[];
  } | null>(null);
  
  const supabase = createClient();
  const userId = DEFAULT_USER_ID;

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }
    
    setFileName(file.name);
    console.log("[CSV Import] Reading file:", file.name, "Size:", file.size, "Template:", csvTemplate);
    
    try {
      const text = await file.text();
      console.log("[CSV Import] File text length:", text.length, "First 200 chars:", text.substring(0, 200));
      
      const allRows = parseCSVByTemplate(text, csvTemplate);
      console.log("[CSV Import] Parsed rows:", allRows.length);
      
      const dedupedRows = dedupeByLink(allRows);
      console.log("[CSV Import] After dedupe:", dedupedRows.length);
      
      // Infer missing states for timezone derivation
      const { rows: rowsWithStates, stats: stateInferenceStats } = inferMissingStates(dedupedRows);
      console.log("[CSV Import] State inference:", stateInferenceStats);
      setInferenceStats(stateInferenceStats);
      
      setParsedRows(rowsWithStates);
      setParseStats({
        totalRows: allRows.length,
        afterDedupe: rowsWithStates.length,
        duplicatesRemoved: allRows.length - rowsWithStates.length,
      });
      
      // Select all by default
      setSelectedRows(new Set(rowsWithStates.map((_, i) => i)));
      
      if (rowsWithStates.length === 0) {
        toast.error("No contacts found in CSV. Check console for details.");
      } else {
        setStep("preview");
        const totalInferred = stateInferenceStats.fromCompany + stateInferenceStats.fromPhone;
        if (totalInferred > 0) {
          toast.success(`Parsed ${rowsWithStates.length} contacts. Inferred state for ${totalInferred} (${stateInferenceStats.fromCompany} from company, ${stateInferenceStats.fromPhone} from phone).`);
        } else {
          toast.success(`Parsed ${rowsWithStates.length} contacts (${allRows.length - rowsWithStates.length} duplicates removed)`);
        }
      }
    } catch (error) {
      console.error("[CSV Import] Parse error:", error);
      toast.error("Failed to parse CSV file. Check console for details.");
    }
  }, [csvTemplate]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const toggleSelectRow = (index: number) => {
    const next = new Set(selectedRows);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedRows(next);
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === parsedRows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(parsedRows.map((_, i) => i)));
    }
  };

  const handleImport = async () => {
    const toImport = parsedRows.filter((_, i) => selectedRows.has(i));
    if (toImport.length === 0) {
      toast.error("No contacts selected");
      return;
    }

    console.log("[CSV Import] Starting import of", toImport.length, "contacts");
    
    setStep("importing");
    setImportProgress(0);
    setImportStats({ created: 0, updated: 0, companiesCreated: 0, failed: 0, notesCreated: 0 });
    setFailedImports([]); // Clear previous failures
    setImportedContactIds([]); // Clear previous imported IDs

    const sourceList = listName || `CSV Import ${new Date().toLocaleDateString()}`;
    let created = 0;
    let updated = 0;
    let companiesCreated = 0;
    let failed = 0;
    let notesCreated = 0;
    const failures: FailedImport[] = [];
    const newContactIds: string[] = []; // Track newly created contact IDs for scheduling

    // Cache for companies by domain to avoid duplicates
    const companyCache = new Map<string, string>(); // domain -> company_id

    for (let i = 0; i < toImport.length; i++) {
      const row = toImport[i];
      console.log(`[CSV Import] Processing ${i + 1}/${toImport.length}: ${row.firstName} ${row.lastName}`);
      
      try {
        // 1. Find or create company
        let companyId: string | null = null;
        const domain = extractDomain(row.email);
        
        if (row.company) {
          // Check cache first
          if (domain && companyCache.has(domain)) {
            companyId = companyCache.get(domain)!;
          } else {
            // Check if company exists by domain
            if (domain) {
              const { data: existingCompany } = await supabase
                .from("companies")
                .select("id")
                .eq("user_id", userId)
                .eq("domain", domain)
                .single();
              
              if (existingCompany) {
                companyId = existingCompany.id;
                companyCache.set(domain, companyId);
              }
            }
            
            // If no company found, check by name
            if (!companyId) {
              const { data: existingByName } = await supabase
                .from("companies")
                .select("id")
                .eq("user_id", userId)
                .eq("name", row.company)
                .single();
              
              if (existingByName) {
                companyId = existingByName.id;
                if (domain) companyCache.set(domain, companyId);
              }
            }
            
            // Create new company if not found
            if (!companyId) {
              const companyData = mapToCompany(row, userId, domain);
              if (companyData) {
                const { data: newCompany, error: companyError } = await supabase
                  .from("companies")
                  .insert(companyData)
                  .select("id")
                  .single();
                
                if (!companyError && newCompany) {
                  companyId = newCompany.id;
                  companiesCreated++;
                  if (domain) companyCache.set(domain, companyId);
                } else if (companyError) {
                  // Track company creation failure (but don't count as failed import - contact may still succeed)
                  console.error("Company insert error:", companyError);
                }
              }
            }
          }
        }

        // 2. Find existing contact by linkedin_url → email → mobile → phone
        let existingContactId: string | null = null;
        
        // Try LinkedIn URL first
        if (row.linkedinUrl) {
          const { data: byLinkedIn } = await supabase
            .from("contacts")
            .select("id")
            .eq("user_id", userId)
            .eq("linkedin_url", row.linkedinUrl)
            .single();
          
          if (byLinkedIn) existingContactId = byLinkedIn.id;
        }
        
        // Try email
        if (!existingContactId && row.email) {
          const { data: byEmail } = await supabase
            .from("contacts")
            .select("id")
            .eq("user_id", userId)
            .eq("email", row.email)
            .single();
          
          if (byEmail) existingContactId = byEmail.id;
        }
        
        // Try mobile (primary phone for Apollo imports)
        if (!existingContactId && row.mobile) {
          const { data: byMobile } = await supabase
            .from("contacts")
            .select("id")
            .eq("user_id", userId)
            .eq("mobile", row.mobile)
            .single();
          
          if (byMobile) existingContactId = byMobile.id;
        }
        
        // Try phone (direct/other)
        if (!existingContactId && row.direct) {
          const { data: byPhone } = await supabase
            .from("contacts")
            .select("id")
            .eq("user_id", userId)
            .eq("phone", row.direct)
            .single();
          
          if (byPhone) existingContactId = byPhone.id;
        }

        // 3. Insert or update contact
        // Helper to check if a value is "missing" (null, empty string, or whitespace only)
        const isMissing = (v: unknown): boolean => {
          if (v == null) return true;
          if (typeof v === "string" && v.trim() === "") return true;
          return false;
        };

        if (existingContactId) {
          // UPDATE: Fetch existing contact to build a "fill missing only" patch
          const { data: existingContact } = await supabase
            .from("contacts")
            .select("first_name, last_name, email, linkedin_url, title, mobile, phone, industry, city, state, company_id, company_name, company_domain, employee_range")
            .eq("id", existingContactId)
            .single();
          
          // Build patch object - only fill in missing fields
          // NEVER touch: stage, BANT flags, cadence fields, is_aaa, call stats, tags
          const updates: Record<string, unknown> = {};
          
          if (existingContact) {
            // Fill basic info if missing
            if (isMissing(existingContact.first_name) && row.firstName) {
              updates.first_name = row.firstName;
            }
            if (isMissing(existingContact.last_name) && row.lastName) {
              updates.last_name = row.lastName;
            }
            if (isMissing(existingContact.email) && row.email) {
              updates.email = row.email;
            }
            if (isMissing(existingContact.linkedin_url) && row.linkedinUrl) {
              updates.linkedin_url = row.linkedinUrl;
            }
            if (isMissing(existingContact.title) && row.position) {
              updates.title = row.position;
            }
            
            // Fill phone numbers if missing (mobile is primary)
            if (isMissing(existingContact.mobile) && row.mobile) {
              updates.mobile = row.mobile;
            }
            if (isMissing(existingContact.phone) && row.direct) {
              updates.phone = row.direct;
            }
            
            // Fill location/company info if missing
            if (isMissing(existingContact.industry) && row.type) {
              updates.industry = row.type;
            }
            if (isMissing(existingContact.city) && row.city) {
              updates.city = row.city;
            }
            if (isMissing(existingContact.state) && row.companyInfo) {
              updates.state = row.companyInfo;
            }
            if (isMissing(existingContact.company_name) && row.company) {
              updates.company_name = row.company;
            }
            if (isMissing(existingContact.company_domain) && row.email) {
              const domain = extractDomain(row.email);
              if (domain) updates.company_domain = domain;
            }
            if (isMissing(existingContact.employee_range) && row.companyHeadcount) {
              updates.employee_range = row.companyHeadcount;
            }
            
            // Only set company_id if it's currently missing
            if (isMissing(existingContact.company_id) && companyId) {
              updates.company_id = companyId;
            }
          }
          
          // Only update if there are changes
          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
              .from("contacts")
              .update(updates)
              .eq("id", existingContactId);
            
            if (updateError) {
              console.error("Update error:", updateError);
              failures.push({
                row,
                type: "contact",
                error: updateError.message,
                errorCode: updateError.code,
              });
              failed++;
            } else {
              updated++;
            }
          } else {
            // No changes needed but still count as "updated" (matched)
            updated++;
          }
          
          // Create note if there's content
          if (row.notes?.trim()) {
            const { error: noteError } = await supabase
              .from("notes")
              .insert({
                user_id: userId,
                contact_id: existingContactId,
                company_id: companyId,
                content: row.notes.trim(),
                is_pinned: true,
                is_company_wide: false,
              });
            
            if (!noteError) notesCreated++;
          }
        } else {
          // INSERT: Create new contact with full data
          const contactData = {
            ...mapToContact(row, userId, companyId || undefined),
            source_list: sourceList,
          };
          
          const { data: newContact, error: insertError } = await supabase
            .from("contacts")
            .insert(contactData)
            .select("id")
            .single();
          
          if (insertError) {
            console.error("Insert error:", insertError);
            failures.push({
              row,
              type: "contact",
              error: insertError.message,
              errorCode: insertError.code,
            });
            failed++;
          } else {
            created++;
            // Track new contact ID for scheduling
            if (newContact) {
              newContactIds.push(newContact.id);
            }
            
            // Create note if there's content
            if (row.notes?.trim() && newContact) {
              const { error: noteError } = await supabase
                .from("notes")
                .insert({
                  user_id: userId,
                  contact_id: newContact.id,
                  company_id: companyId,
                  content: row.notes.trim(),
                  is_pinned: true,
                  is_company_wide: false,
                });
              
              if (!noteError) notesCreated++;
            }
          }
        }
      } catch (error) {
        console.error("Import error for row:", row, error);
        failures.push({
          row,
          type: "contact",
          error: error instanceof Error ? error.message : String(error),
        });
        failed++;
      }

      // Update progress
      setImportProgress(Math.round(((i + 1) / toImport.length) * 100));
      setImportStats({ created, updated, companiesCreated, failed, notesCreated });
    }

    // Set final state
    setFailedImports(failures);
    setImportedContactIds(newContactIds);
    
    if (failures.length > 0) {
      toast.warning(`Imported ${created + updated} contacts with ${failures.length} failure(s)`);
    } else {
      toast.success(`Imported ${created + updated} contacts!`);
    }
    
    // Auto-schedule if enabled and there are new contacts
    if (scheduleEnabled && newContactIds.length > 0) {
      setIsScheduling(true);
      setStep("scheduling");
      
      try {
        const response = await fetch("/api/dialer/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactIds: newContactIds,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to schedule contacts");
        }

        const result = await response.json();
        setScheduleResult(result);
        toast.success(`Scheduled ${result.scheduled} contacts across ${result.distribution.length} business days`);
      } catch (error) {
        console.error("Schedule error:", error);
        toast.error("Failed to schedule contacts - you can try again from the dialer");
      } finally {
        setIsScheduling(false);
      }
    }
    
    setStep("done");
  };

  // Step: Upload
  if (step === "upload") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import from CSV
            </CardTitle>
            <CardDescription>
              Upload a CSV file with your contact list
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* CSV Template Selector */}
            <div className="space-y-2">
              <Label htmlFor="csv-template">CSV Format</Label>
              <Select value={csvTemplate} onValueChange={(v) => setCsvTemplate(v as CSVTemplate)}>
                <SelectTrigger id="csv-template" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apollo">Apollo Export</SelectItem>
                  <SelectItem value="legacy">Legacy (CX Call List)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {csvTemplate === "apollo" 
                  ? "Standard Apollo contact export with Mobile Phone, Other Phone, City, State columns"
                  : "Legacy CX Call List format with Direct, Mobile, Company Info columns"
                }
              </p>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById("csv-upload")?.click()}
              className={`
                border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer
                ${isDragging 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }
              `}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">
                Drag and drop your CSV file here
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click anywhere to browse
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <Button variant="outline" type="button">
                Select File
              </Button>
            </div>

            {/* List Name */}
            <div className="space-y-2">
              <Label htmlFor="list-name">Import List Name (optional)</Label>
              <Input
                id="list-name"
                placeholder={csvTemplate === "apollo" 
                  ? `Apollo Import ${new Date().toLocaleDateString()}`
                  : `CX Call List ${new Date().toLocaleDateString()}`
                }
                value={listName}
                onChange={(e) => setListName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This will be saved as the source_list for imported contacts
              </p>
            </div>

            {/* Expected Format */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Expected CSV columns ({csvTemplate === "apollo" ? "Apollo" : "Legacy"}):</p>
              <div className="flex flex-wrap gap-1.5">
                {csvTemplate === "apollo" ? (
                  [
                    "First Name", "Last Name", "Title", "Company Name", "Email",
                    "Mobile Phone", "Other Phone", "Work Direct Phone", "Home Phone",
                    "Person Linkedin Url", "Industry", "City", "State", "# Employees"
                  ].map((col) => (
                    <Badge key={col} variant="secondary" className="text-xs">
                      {col}
                    </Badge>
                  ))
                ) : (
                  [
                    "Last Name", "First Name", "Company", "Link (LinkedIn)", 
                    "Type", "Company Info", "Company Headcount", "Time Zone",
                    "Mobile", "Direct", "Email", "Position", "Personal Connector + Bio",
                    "Answered", "Notes"
                  ].map((col) => (
                    <Badge key={col} variant="secondary" className="text-xs">
                      {col}
                    </Badge>
                  ))
                )}
              </div>
              {csvTemplate === "apollo" && (
                <p className="text-xs text-muted-foreground mt-2">
                  Phone priority: Mobile Phone (primary) → Other Phone → Work Direct Phone → Home Phone (fallback)
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step: Preview
  if (step === "preview") {
    // Count contacts with phone numbers
    const withPhone = parsedRows.filter(r => r.direct || r.mobile).length;
    const withEmail = parsedRows.filter(r => r.email).length;
    const withLinkedIn = parsedRows.filter(r => r.linkedinUrl).length;
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Preview Import</h2>
            <p className="text-sm text-muted-foreground">
              {parseStats.afterDedupe} contacts from {fileName}
              {parseStats.duplicatesRemoved > 0 && (
                <span className="text-amber-600 ml-2">
                  ({parseStats.duplicatesRemoved} duplicates removed)
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={scheduleEnabled}
                onCheckedChange={(v) => setScheduleEnabled(!!v)}
              />
              <span className="text-muted-foreground">Auto-schedule into cadence</span>
            </label>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                setStep("upload");
                setParsedRows([]);
                setFileName("");
              }}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={selectedRows.size === 0}>
                <Upload className="mr-2 h-4 w-4" />
                Import {selectedRows.size} Contacts
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{parseStats.afterDedupe}</p>
                  <p className="text-xs text-muted-foreground">Total Contacts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Phone className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{withPhone}</p>
                  <p className="text-xs text-muted-foreground">With Phone</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{withLinkedIn}</p>
                  <p className="text-xs text-muted-foreground">With LinkedIn</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold">{parseStats.afterDedupe - withPhone}</p>
                  <p className="text-xs text-muted-foreground">No Phone (won&#39;t dial)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* State Inference Info */}
        {inferenceStats && (inferenceStats.fromCompany > 0 || inferenceStats.fromPhone > 0) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>
              Inferred state/timezone for {inferenceStats.fromCompany + inferenceStats.fromPhone} contacts
              {inferenceStats.fromCompany > 0 && ` (${inferenceStats.fromCompany} from company data`}
              {inferenceStats.fromCompany > 0 && inferenceStats.fromPhone > 0 && ", "}
              {inferenceStats.fromPhone > 0 && `${inferenceStats.fromPhone} from phone area code`}
              {(inferenceStats.fromCompany > 0 || inferenceStats.fromPhone > 0) && ")"}
            </span>
          </div>
        )}

        {/* Preview Table */}
        <Card>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedRows.size === parsedRows.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact Info</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedRows.map((row, index) => (
                  <TableRow key={index} className={!row.direct && !row.mobile ? "opacity-60" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.has(index)}
                        onCheckedChange={() => toggleSelectRow(index)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {row.firstName} {row.lastName}
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">
                      {row.position || "-"}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium truncate max-w-[180px]">{row.company || "-"}</p>
                        {row.companyHeadcount && (
                          <p className="text-xs text-muted-foreground">{row.companyHeadcount}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {row._template === "apollo" 
                        ? (row.city && row.companyInfo 
                            ? `${row.city}, ${row.companyInfo}` 
                            : row.city || row.companyInfo || "-")
                        : (row.companyInfo || "-")
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {row.email && <Badge variant="outline">Email</Badge>}
                        {row.mobile && <Badge variant="outline" className="bg-green-500/10">Mobile</Badge>}
                        {row.direct && (
                          <Badge variant="outline">
                            {row._template === "apollo" ? "Other/Work" : "Direct"}
                          </Badge>
                        )}
                        {row.linkedinUrl && <Badge variant="outline">LinkedIn</Badge>}
                        {!row.email && !row.direct && !row.mobile && !row.linkedinUrl && (
                          <Badge variant="destructive">No contact info</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      </div>
    );
  }

  // Step: Importing
  if (step === "importing") {
    return (
      <div className="max-w-md mx-auto text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Importing Contacts</h2>
          <p className="text-muted-foreground">Creating companies and contacts...</p>
        </div>
        <Progress value={importProgress} className="w-full" />
        <div className="text-sm text-muted-foreground space-y-1">
          <p>{importStats.created} contacts created</p>
          <p>{importStats.updated} contacts updated</p>
          <p>{importStats.companiesCreated} companies created</p>
          {importStats.failed > 0 && (
            <p className="text-red-500">{importStats.failed} failed</p>
          )}
        </div>
      </div>
    );
  }

  // Step: Scheduling
  if (step === "scheduling") {
    return (
      <div className="max-w-md mx-auto text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <Calendar className="h-8 w-8 text-blue-600 animate-pulse" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Scheduling Contacts</h2>
          <p className="text-muted-foreground">
            Distributing {importedContactIds.length} new contacts across business days...
          </p>
        </div>
        <Progress value={isScheduling ? 50 : 100} className="w-full" />
        {scheduleResult && (
          <div className="text-sm text-muted-foreground space-y-2">
            <p className="text-green-600 font-medium">
              Scheduled {scheduleResult.scheduled} contacts across {scheduleResult.distribution.length} days
            </p>
            <div className="text-left bg-muted/50 rounded-lg p-4 max-h-48 overflow-y-auto">
              <p className="font-medium mb-2">Distribution:</p>
              {scheduleResult.distribution.slice(0, 10).map(({ date, count }) => (
                <div key={date} className="flex justify-between text-xs">
                  <span>{new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                  <span className="font-medium">{count} contacts</span>
                </div>
              ))}
              {scheduleResult.distribution.length > 10 && (
                <p className="text-xs text-muted-foreground mt-2">
                  ...and {scheduleResult.distribution.length - 10} more days
                </p>
              )}
            </div>
          </div>
        )}
        {!isScheduling && (
          <div className="flex gap-2 justify-center">
            <Button onClick={() => window.location.href = "/companies"}>
              <Building2 className="mr-2 h-4 w-4" />
              View Companies
            </Button>
            <Button onClick={() => window.location.href = "/dialer"}>
              <Phone className="mr-2 h-4 w-4" />
              Start Calling
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Step: Done
  return (
    <div className="max-w-md mx-auto text-center space-y-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <CheckCircle2 className="h-8 w-8 text-green-600" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">Import Complete!</h2>
        <p className="text-muted-foreground">Your contacts are ready to call.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-green-600">{importStats.created}</p>
            <p className="text-xs text-muted-foreground">Created</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-blue-600">{importStats.updated}</p>
            <p className="text-xs text-muted-foreground">Updated</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-purple-600">{importStats.companiesCreated}</p>
            <p className="text-xs text-muted-foreground">Companies Created</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-amber-600">{importStats.notesCreated}</p>
            <p className="text-xs text-muted-foreground">Notes Added</p>
          </CardContent>
        </Card>
      </div>
      {importStats.failed > 0 && (
        <Card 
          className="border-red-200 dark:border-red-900 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
          onClick={() => setShowFailedDialog(true)}
        >
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-red-600">{importStats.failed}</p>
            <p className="text-xs text-muted-foreground">Failed - Click to view details</p>
          </CardContent>
        </Card>
      )}

      {/* Scheduling Results (auto-scheduled during import) */}
      {scheduleResult && scheduleResult.scheduled > 0 && (
        <Card className="border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-900/10">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-700 dark:text-green-400">
                {scheduleResult.scheduled} contacts scheduled
              </span>
            </div>
            <p className="text-sm text-muted-foreground text-left">
              Distributed across {scheduleResult.distribution.length} business days to maintain ~150 new contacts/day
            </p>
            <div className="text-left bg-muted/50 rounded-lg p-3 max-h-32 overflow-y-auto">
              {scheduleResult.distribution.slice(0, 5).map(({ date, count }) => (
                <div key={date} className="flex justify-between text-xs py-0.5">
                  <span>{new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
              {scheduleResult.distribution.length > 5 && (
                <p className="text-xs text-muted-foreground mt-1">
                  ...and {scheduleResult.distribution.length - 5} more days
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Show if scheduling was skipped */}
      {importedContactIds.length > 0 && !scheduleResult && (
        <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-600" />
              <span className="text-sm text-amber-700 dark:text-amber-400">
                {importedContactIds.length} contacts not scheduled (cadence toggle was off)
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              You can distribute these later from the Power Dialer
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 justify-center">
        <Button variant="outline" onClick={() => {
          setStep("upload");
          setParsedRows([]);
          setFileName("");
          setImportStats({ created: 0, updated: 0, companiesCreated: 0, failed: 0, notesCreated: 0 });
          setImportProgress(0);
          setImportedContactIds([]);
          setScheduleResult(null);
        }}>
          Import More
        </Button>
        <Button onClick={() => window.location.href = "/companies"}>
          <Building2 className="mr-2 h-4 w-4" />
          View Companies
        </Button>
        <Button onClick={() => window.location.href = "/dialer"}>
          <Phone className="mr-2 h-4 w-4" />
          Start Calling
        </Button>
      </div>

      {/* Failed Imports Dialog */}
      <Dialog open={showFailedDialog} onOpenChange={setShowFailedDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Failed Imports ({failedImports.length})
            </DialogTitle>
            <DialogDescription>
              The following contacts could not be imported. Review the errors below.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedImports.map((failure, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {failure.row.firstName} {failure.row.lastName}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {failure.row.company || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="text-xs font-normal">
                        {getFriendlyErrorMessage(failure.error, failure.errorCode)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowFailedDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
