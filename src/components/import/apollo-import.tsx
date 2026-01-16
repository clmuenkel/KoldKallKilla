"use client";

import { useState, useEffect } from "react";
import { useBulkCreateContacts } from "@/hooks/use-contacts";
import { mapApolloToContact } from "@/lib/apollo/client";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { INDUSTRIES, EMPLOYEE_RANGES } from "@/lib/constants";
import { toast } from "sonner";
import {
  Search,
  Download,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import type { ApolloPerson } from "@/types/apollo";
import { DEFAULT_USER_ID } from "@/lib/default-user";

const TITLE_PRESETS = [
  { value: "finance", label: "Finance Leaders", titles: ["CFO", "Chief Financial Officer", "VP Finance", "VP of Finance", "Director of Finance", "Controller", "Treasurer"] },
  { value: "operations", label: "Operations Leaders", titles: ["COO", "Chief Operating Officer", "VP Operations", "VP of Operations", "Director of Operations"] },
  { value: "it", label: "IT Leaders", titles: ["CIO", "CTO", "Chief Information Officer", "Chief Technology Officer", "VP IT", "Director of IT"] },
  { value: "executive", label: "C-Suite", titles: ["CEO", "CFO", "COO", "CIO", "CTO", "President"] },
];

export function ApolloImport() {
  const [step, setStep] = useState<"search" | "preview" | "importing" | "done">("search");
  const [apiKey, setApiKey] = useState("");
  const userId = DEFAULT_USER_ID;
  
  // Search params
  const [industry, setIndustry] = useState<string>("");
  const [employeeRange, setEmployeeRange] = useState<string>("1001-5000");
  const [titlePreset, setTitlePreset] = useState<string>("finance");
  const [customTitles, setCustomTitles] = useState<string>("");
  const [listName, setListName] = useState("");
  
  // Results
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ApolloPerson[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  
  // Import progress
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState({ imported: 0, duplicates: 0, failed: 0 });

  const supabase = createClient();
  const bulkCreate = useBulkCreateContacts();

  // Load saved API key from settings
  useEffect(() => {
    const loadApiKey = async () => {
      const { data: settings } = await supabase
        .from("user_settings")
        .select("apollo_api_key")
        .eq("user_id", userId)
        .single();
      
      if (settings?.apollo_api_key) {
        setApiKey(settings.apollo_api_key);
      }
    };
    loadApiKey();
  }, [supabase, userId]);

  const handleSearch = async () => {
    if (!apiKey) {
      toast.error("Please enter your Apollo API key");
      return;
    }

    setIsSearching(true);
    try {
      // Build titles array
      let titles: string[] = [];
      if (titlePreset) {
        const preset = TITLE_PRESETS.find(p => p.value === titlePreset);
        if (preset) titles = preset.titles;
      }
      if (customTitles) {
        titles = [...titles, ...customTitles.split(",").map(t => t.trim()).filter(Boolean)];
      }

      // Build employee range
      const [min, max] = employeeRange.split("-").map(s => s.replace("+", ""));
      const empRange = max ? `${min},${max}` : `${min},`;

      const response = await fetch("/api/apollo/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          organization_industry_tag_ids: industry ? [industry] : undefined,
          organization_num_employees_ranges: [empRange],
          person_titles: titles.length > 0 ? titles : undefined,
          page: 1,
          per_page: 50,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Search failed");
      }

      const data = await response.json();
      setSearchResults(data.people || []);
      setPagination({
        page: data.pagination?.page || 1,
        total: data.pagination?.total_entries || 0,
        totalPages: data.pagination?.total_pages || 0,
      });
      
      // Select all by default
      setSelectedContacts(new Set(data.people?.map((p: ApolloPerson) => p.id) || []));
      
      setStep("preview");
      toast.success(`Found ${data.pagination?.total_entries || 0} contacts`);
    } catch (error: any) {
      toast.error(error.message || "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleImport = async () => {
    const toImport = searchResults.filter(p => selectedContacts.has(p.id));
    if (toImport.length === 0) {
      toast.error("No contacts selected");
      return;
    }

    setStep("importing");
    setImportProgress(0);
    setImportStats({ imported: 0, duplicates: 0, failed: 0 });

    try {
      // Map Apollo contacts to our format
      const contacts = toImport.map(person => 
        mapApolloToContact(person, userId, listName || `Apollo Import ${new Date().toLocaleDateString()}`)
      );

      // Check for existing contacts by apollo_id or email
      const apolloIds = contacts.map(c => c.apollo_id).filter(Boolean);
      const emails = contacts.map(c => c.email).filter(Boolean);

      const { data: existing } = await supabase
        .from("contacts")
        .select("apollo_id, email")
        .or(`apollo_id.in.(${apolloIds.join(",")}),email.in.(${emails.join(",")})`);

      const existingApolloIds = new Set(existing?.map(e => e.apollo_id) || []);
      const existingEmails = new Set(existing?.map(e => e.email) || []);

      // Filter out duplicates
      const newContacts = contacts.filter(c => 
        !existingApolloIds.has(c.apollo_id) && !existingEmails.has(c.email)
      );
      const duplicateCount = contacts.length - newContacts.length;

      // Import in batches
      const batchSize = 25;
      let imported = 0;
      
      for (let i = 0; i < newContacts.length; i += batchSize) {
        const batch = newContacts.slice(i, i + batchSize);
        await bulkCreate.mutateAsync(batch as any);
        imported += batch.length;
        setImportProgress(Math.round((imported / newContacts.length) * 100));
        setImportStats(prev => ({ ...prev, imported }));
      }

      setImportStats({
        imported: newContacts.length,
        duplicates: duplicateCount,
        failed: 0,
      });

      // Save API key to settings if not already saved
      await supabase
        .from("user_settings")
        .upsert({ user_id: userId, apollo_api_key: apiKey });

      setStep("done");
      toast.success(`Successfully imported ${newContacts.length} contacts!`);
    } catch (error: any) {
      toast.error(error.message || "Import failed");
      setStep("preview");
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedContacts);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedContacts(next);
  };

  const toggleSelectAll = () => {
    if (selectedContacts.size === searchResults.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(searchResults.map(p => p.id)));
    }
  };

  // Step: Search
  if (step === "search") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Apollo
            </CardTitle>
            <CardDescription>
              Find contacts matching your ideal customer profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="api-key">Apollo API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your Apollo API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Find your API key in Apollo Settings → API
              </p>
            </div>

            {/* Industry */}
            <div className="space-y-2">
              <Label>Industry</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_unions">Credit Unions</SelectItem>
                  <SelectItem value="hospitals">Hospitals & Healthcare</SelectItem>
                  <SelectItem value="banking">Banking & Financial Services</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Employee Count */}
            <div className="space-y-2">
              <Label>Employee Count</Label>
              <Select value={employeeRange} onValueChange={setEmployeeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label} employees
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Job Titles */}
            <div className="space-y-2">
              <Label>Job Titles</Label>
              <Select value={titlePreset} onValueChange={setTitlePreset}>
                <SelectTrigger>
                  <SelectValue placeholder="Select title preset" />
                </SelectTrigger>
                <SelectContent>
                  {TITLE_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Add custom titles (comma-separated)"
                value={customTitles}
                onChange={(e) => setCustomTitles(e.target.value)}
              />
            </div>

            {/* List Name */}
            <div className="space-y-2">
              <Label htmlFor="list-name">List Name (optional)</Label>
              <Input
                id="list-name"
                placeholder={`e.g., Credit Unions ${new Date().toLocaleDateString()}`}
                value={listName}
                onChange={(e) => setListName(e.target.value)}
              />
            </div>

            <Button onClick={handleSearch} disabled={isSearching || !apiKey} className="w-full">
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search Contacts
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step: Preview
  if (step === "preview") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Preview Results</h2>
            <p className="text-sm text-muted-foreground">
              {pagination.total} contacts found • {selectedContacts.size} selected
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("search")}>
              Back to Search
            </Button>
            <Button onClick={handleImport} disabled={selectedContacts.size === 0}>
              <Download className="mr-2 h-4 w-4" />
              Import {selectedContacts.size} Contacts
            </Button>
          </div>
        </div>

        <Card>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedContacts.size === searchResults.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedContacts.has(person.id)}
                        onCheckedChange={() => toggleSelect(person.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {person.first_name} {person.last_name}
                    </TableCell>
                    <TableCell>{person.title || "-"}</TableCell>
                    <TableCell>
                      <div>
                        <p>{person.organization?.name || "-"}</p>
                        {person.organization?.estimated_num_employees && (
                          <p className="text-xs text-muted-foreground">
                            {person.organization.estimated_num_employees.toLocaleString()} employees
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {[person.city, person.state].filter(Boolean).join(", ") || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {person.email && <Badge variant="outline">Email</Badge>}
                        {person.phone_numbers?.length > 0 && (
                          <Badge variant="outline">Phone</Badge>
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
          <p className="text-muted-foreground">Please wait...</p>
        </div>
        <Progress value={importProgress} className="w-full" />
        <p className="text-sm text-muted-foreground">
          {importStats.imported} of {selectedContacts.size} imported
        </p>
      </div>
    );
  }

  // Step: Done
  return (
    <div className="max-w-md mx-auto text-center space-y-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="h-8 w-8 text-green-600" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">Import Complete!</h2>
        <p className="text-muted-foreground">Your contacts are ready to call.</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-green-600">{importStats.imported}</p>
            <p className="text-xs text-muted-foreground">Imported</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-yellow-600">{importStats.duplicates}</p>
            <p className="text-xs text-muted-foreground">Duplicates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-red-600">{importStats.failed}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
      </div>
      <div className="flex gap-2 justify-center">
        <Button variant="outline" onClick={() => setStep("search")}>
          Import More
        </Button>
        <Button onClick={() => window.location.href = "/dialer"}>
          Start Calling
        </Button>
      </div>
    </div>
  );
}
