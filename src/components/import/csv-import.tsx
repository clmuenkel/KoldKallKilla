"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_USER_ID } from "@/lib/default-user";
import {
  parseCSV,
  dedupeByLink,
  extractDomain,
  mapToContact,
  mapToCompany,
  type ParsedCSVRow,
} from "@/lib/csv-parser";
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
} from "lucide-react";

type ImportStep = "upload" | "preview" | "importing" | "done";

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
  
  // Parsed data
  const [parsedRows, setParsedRows] = useState<ParsedCSVRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [parseStats, setParseStats] = useState({ totalRows: 0, afterDedupe: 0, duplicatesRemoved: 0 });
  
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
  
  const supabase = createClient();
  const userId = DEFAULT_USER_ID;

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }
    
    setFileName(file.name);
    console.log("[CSV Import] Reading file:", file.name, "Size:", file.size);
    
    try {
      const text = await file.text();
      console.log("[CSV Import] File text length:", text.length, "First 200 chars:", text.substring(0, 200));
      
      const allRows = parseCSV(text);
      console.log("[CSV Import] Parsed rows:", allRows.length);
      
      const dedupedRows = dedupeByLink(allRows);
      console.log("[CSV Import] After dedupe:", dedupedRows.length);
      
      setParsedRows(dedupedRows);
      setParseStats({
        totalRows: allRows.length,
        afterDedupe: dedupedRows.length,
        duplicatesRemoved: allRows.length - dedupedRows.length,
      });
      
      // Select all by default
      setSelectedRows(new Set(dedupedRows.map((_, i) => i)));
      
      if (dedupedRows.length === 0) {
        toast.error("No contacts found in CSV. Check console for details.");
      } else {
        setStep("preview");
        toast.success(`Parsed ${dedupedRows.length} contacts (${allRows.length - dedupedRows.length} duplicates removed)`);
      }
    } catch (error) {
      console.error("[CSV Import] Parse error:", error);
      toast.error("Failed to parse CSV file. Check console for details.");
    }
  }, []);

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

    const sourceList = listName || `CSV Import ${new Date().toLocaleDateString()}`;
    let created = 0;
    let updated = 0;
    let companiesCreated = 0;
    let failed = 0;
    let notesCreated = 0;
    const failures: FailedImport[] = [];

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

        // 2. Find existing contact by linkedin_url → email → phone
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
        
        // Try phone (direct)
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
        const contactData = {
          ...mapToContact(row, userId, companyId || undefined),
          source_list: sourceList,
        };

        if (existingContactId) {
          // Update existing contact
          const { error: updateError } = await supabase
            .from("contacts")
            .update(contactData)
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
            
            // Create note if there's content
            if (row.notes?.trim()) {
              const { error: noteError } = await supabase
                .from("notes")
                .insert({
                  user_id: userId,
                  contact_id: existingContactId,
                  company_id: companyId,
                  content: row.notes.trim(),
                  is_pinned: false,
                  is_company_wide: false,
                });
              
              if (!noteError) notesCreated++;
            }
          }
        } else {
          // Insert new contact
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
            
            // Create note if there's content
            if (row.notes?.trim() && newContact) {
              const { error: noteError } = await supabase
                .from("notes")
                .insert({
                  user_id: userId,
                  contact_id: newContact.id,
                  company_id: companyId,
                  content: row.notes.trim(),
                  is_pinned: false,
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
    setStep("done");
    
    if (failures.length > 0) {
      toast.warning(`Imported ${created + updated} contacts with ${failures.length} failure(s)`);
    } else {
      toast.success(`Imported ${created + updated} contacts!`);
    }
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
                placeholder={`e.g., CX Call List ${new Date().toLocaleDateString()}`}
                value={listName}
                onChange={(e) => setListName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This will be saved as the source_list for imported contacts
              </p>
            </div>

            {/* Expected Format */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Expected CSV columns:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Last Name", "First Name", "Company", "Link (LinkedIn)", 
                  "Type", "Company Info", "Company Headcount", "Time Zone",
                  "Mobile", "Direct", "Email", "Position", "Personal Connector + Bio",
                  "Answered", "Notes"
                ].map((col) => (
                  <Badge key={col} variant="secondary" className="text-xs">
                    {col}
                  </Badge>
                ))}
              </div>
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
                      {row.companyInfo || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {row.email && <Badge variant="outline">Email</Badge>}
                        {row.direct && <Badge variant="outline">Direct</Badge>}
                        {row.mobile && <Badge variant="outline">Mobile</Badge>}
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
      <div className="flex gap-2 justify-center">
        <Button variant="outline" onClick={() => {
          setStep("upload");
          setParsedRows([]);
          setFileName("");
          setImportStats({ created: 0, updated: 0, companiesCreated: 0, failed: 0, notesCreated: 0 });
          setImportProgress(0);
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
