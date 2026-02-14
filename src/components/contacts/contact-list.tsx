"use client";

import { useState } from "react";
import { usePaginatedContacts, useDeleteContact, useUpdateContact, useBulkDeleteContacts, type ContactFilters } from "@/hooks/use-contacts";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useDialerStore } from "@/stores/dialer-store";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, StageBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AbuButton } from "@/components/ui/abu-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { STAGES, INDUSTRIES } from "@/lib/constants";
import { formatPhone, copyToClipboard, getInitials, cn } from "@/lib/utils";
import { DialerPoolDialog, isEntityPaused, INDEFINITE_PAUSE_DATE, PAUSE_DURATION_OPTIONS } from "@/components/dialer/dialer-pool-dialog";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_USER_ID } from "@/lib/default-user";
import { 
  Search, 
  Phone, 
  Mail, 
  Trash2, 
  Eye, 
  Copy, 
  ExternalLink,
  MoreHorizontal,
  UserPlus,
  Users,
  Download,
  Filter,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  Clock,
  CheckCircle2,
  Kanban,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Star,
  Calendar,
  Repeat,
  Loader2,
  PauseCircle,
  PlayCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Contact } from "@/types/database";

const LAST_CONTACTED_OPTIONS = [
  { value: "all", label: "Any time" },
  { value: "never", label: "Never contacted" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "older", label: "30+ days ago" },
];

const BANT_OPTIONS = [
  { value: "-1", label: "Any BANT score" },
  { value: "0", label: "0+ (All)" },
  { value: "1", label: "1+ (At least 1)" },
  { value: "2", label: "2+ (At least 2)" },
  { value: "3", label: "3+ (At least 3)" },
  { value: "4", label: "4 (Fully qualified)" },
];

const SORT_OPTIONS = [
  { value: "created", label: "Date Created" },
  { value: "name", label: "Name" },
  { value: "last_contacted", label: "Last Contacted" },
  { value: "bant", label: "BANT Score" },
];

export function ContactList() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [stageFilter, setStageFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [lastContactedFilter, setLastContactedFilter] = useState<ContactFilters["lastContacted"] | "all">("all");
  const [dialerPoolFilter, setDialerPoolFilter] = useState<"all" | "in_pool" | "removed">("all");
  const [bantFilter, setBantFilter] = useState("-1");
  const [hasPhoneFilter, setHasPhoneFilter] = useState(false);
  const [hasEmailFilter, setHasEmailFilter] = useState(false);
  const [aaaFilter, setAaaFilter] = useState(false);
  const [sortBy, setSortBy] = useState<ContactFilters["sortBy"]>("created");
  const [sortOrder, setSortOrder] = useState<ContactFilters["sortOrder"]>("desc");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pauseDialogContact, setPauseDialogContact] = useState<Contact | null>(null);
  const pageSize = 50;
  const router = useRouter();

  const filters: ContactFilters = {
    search: debouncedSearch || undefined,
    stage: stageFilter !== "all" ? stageFilter : undefined,
    industry: industryFilter !== "all" ? industryFilter : undefined,
    lastContacted: lastContactedFilter !== "all" ? lastContactedFilter : undefined,
    dialerPool: dialerPoolFilter !== "all" ? dialerPoolFilter : undefined,
    bantScore: bantFilter !== "-1" ? parseInt(bantFilter) : undefined,
    hasPhone: hasPhoneFilter || undefined,
    hasEmail: hasEmailFilter || undefined,
    aaaOnly: aaaFilter || undefined,
    sortBy,
    sortOrder,
    page,
    pageSize,
  };

  const { data: paginatedData, isLoading } = usePaginatedContacts(filters);
  const contacts = paginatedData?.data;
  const totalCount = paginatedData?.totalCount || 0;
  const totalPages = paginatedData?.totalPages || 1;
  
  const activeFilterCount = [
    stageFilter !== "all",
    industryFilter !== "all",
    lastContactedFilter !== "all",
    dialerPoolFilter !== "all",
    bantFilter !== "-1",
    hasPhoneFilter,
    hasEmailFilter,
    aaaFilter,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSearch("");
    setStageFilter("all");
    setIndustryFilter("all");
    setLastContactedFilter("all");
    setDialerPoolFilter("all");
    setBantFilter("-1");
    setHasPhoneFilter(false);
    setHasEmailFilter(false);
    setAaaFilter(false);
    setPage(1);
  };

  // Reset page when filters change
  const handleFilterChange = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
    setter(value);
    setPage(1);
  };

  const deleteContact = useDeleteContact();
  const updateContact = useUpdateContact();

  const handleToggleAAA = async (contact: Contact, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateContact.mutateAsync({
        id: contact.id,
        updates: { is_aaa: !contact.is_aaa }
      });
      toast.success(contact.is_aaa ? "Removed AAA status" : "Marked as AAA priority");
    } catch (error) {
      toast.error("Failed to update AAA status");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(contacts?.map((c) => c.id) || []);
    } else {
      setSelected([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelected([...selected, id]);
    } else {
      setSelected(selected.filter((s) => s !== id));
    }
  };

  const handleCopyPhone = async (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await copyToClipboard(phone);
    toast.success("Phone number copied!");
  };

  const handleCopyEmail = async (email: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await copyToClipboard(email);
    toast.success("Email copied!");
  };

  const handleDelete = async (id: string) => {
    await deleteContact.mutateAsync(id);
    toast.success("Contact deleted");
  };

  const hasFilters = search || activeFilterCount > 0;

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {/* Stage Filter */}
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[150px] h-10">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {STAGES.map((stage) => (
              <SelectItem key={stage.value} value={stage.value}>
                <div className="flex items-center gap-2">
                  <div className={cn("h-2 w-2 rounded-full", stage.color)} />
                  {stage.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Advanced Filters Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-10 gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Filters</h4>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                    onClick={clearAllFilters}
                  >
                    Clear all
                  </Button>
                )}
              </div>

              {/* Industry */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Industry</Label>
                <Select value={industryFilter} onValueChange={setIndustryFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Industries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Industries</SelectItem>
                    {INDUSTRIES.map((industry) => (
                      <SelectItem key={industry.value} value={industry.value}>
                        {industry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Last Contacted */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Last Contacted</Label>
                <Select 
                  value={lastContactedFilter} 
                  onValueChange={(v) => setLastContactedFilter(v as typeof lastContactedFilter)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAST_CONTACTED_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dialer pool */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Dialer pool</Label>
                <Select
                  value={dialerPoolFilter}
                  onValueChange={(v) => {
                    setDialerPoolFilter(v as "all" | "in_pool" | "removed");
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        All
                      </div>
                    </SelectItem>
                    <SelectItem value="in_pool">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        In pool
                      </div>
                    </SelectItem>
                    <SelectItem value="removed">
                      <div className="flex items-center gap-2">
                        <PauseCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        Removed from pool
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* BANT Score */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">BANT Score</Label>
                <Select value={bantFilter} onValueChange={setBantFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BANT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Contact Info Filters */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Contact Info</Label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox 
                      checked={hasPhoneFilter} 
                      onCheckedChange={(v) => setHasPhoneFilter(!!v)} 
                    />
                    <span className="text-sm">Has phone number</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox 
                      checked={hasEmailFilter} 
                      onCheckedChange={(v) => setHasEmailFilter(!!v)} 
                    />
                    <span className="text-sm">Has email</span>
                  </label>
                </div>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Priority</Label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={aaaFilter} 
                    onCheckedChange={(v) => setAaaFilter(!!v)} 
                  />
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span className="text-sm">AAA contacts only</span>
                </label>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Quick AAA Toggle Button */}
        <Button
          variant={aaaFilter ? "default" : "outline"}
          size="sm"
          onClick={() => handleFilterChange(setAaaFilter, !aaaFilter)}
          className={cn(
            "h-10 gap-2",
            aaaFilter && "bg-amber-500 hover:bg-amber-600 text-white"
          )}
        >
          <Star className={cn("h-4 w-4", aaaFilter && "fill-white")} />
          AAA
        </Button>

        {/* Sort Dropdown */}
        <Select 
          value={`${sortBy}-${sortOrder}`} 
          onValueChange={(v) => {
            const [sort, order] = v.split("-");
            setSortBy(sort as ContactFilters["sortBy"]);
            setSortOrder(order as ContactFilters["sortOrder"]);
          }}
        >
          <SelectTrigger className="w-[170px] h-10">
            <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={`${opt.value}-desc`} value={`${opt.value}-desc`}>
                {opt.label} (Newest)
              </SelectItem>
            ))}
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={`${opt.value}-asc`} value={`${opt.value}-asc`}>
                {opt.label} (Oldest)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground"
          >
            Clear all
          </Button>
        )}

        <div className="flex-1" />

        <Link href="/contacts/new">
          <Button size="sm" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add Contact
          </Button>
        </Link>
      </div>

      {/* Bulk Actions Bar */}
      {selected.length > 0 && (
        <BulkActionsBar
          selected={selected}
          onClearSelection={() => setSelected([])}
        />
      )}

      {/* Table */}
      {isLoading ? (
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/30">
                <TableHead className="w-12 sticky top-0 bg-muted/30">
                  <Checkbox
                    checked={selected.length === contacts?.length && contacts?.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="sticky top-0 bg-muted/30">Contact</TableHead>
                <TableHead className="sticky top-0 bg-muted/30">Company</TableHead>
                <TableHead className="sticky top-0 bg-muted/30">Phone</TableHead>
                <TableHead className="sticky top-0 bg-muted/30">Email</TableHead>
                <TableHead className="sticky top-0 bg-muted/30">Stage</TableHead>
                <TableHead className="w-28 text-right sticky top-0 bg-muted/30">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!contacts || contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
                        <UserPlus className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">No contacts found</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {hasFilters 
                            ? "Try adjusting your filters"
                            : "Get started by adding your first contact"
                          }
                        </p>
                      </div>
                      <div className="flex gap-2 mt-2">
                        {hasFilters ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSearch("");
                              setStageFilter("all");
                            }}
                          >
                            Clear filters
                          </Button>
                        ) : (
                          <>
                            <Link href="/contacts/new">
                              <Button size="sm">Add Contact</Button>
                            </Link>
                            <Link href="/import">
                              <Button variant="outline" size="sm">
                                Import from Apollo
                              </Button>
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((contact, index) => (
                  <ContactRow
                    key={contact.id}
                    contact={contact}
                    selected={selected.includes(contact.id)}
                    onSelect={(checked) => handleSelect(contact.id, checked)}
                    onCopyPhone={(e) => contact.phone && handleCopyPhone(contact.phone, e)}
                    onCopyEmail={(e) => contact.email && handleCopyEmail(contact.email, e)}
                    onDelete={() => handleDelete(contact.id)}
                    onToggleAAA={(e) => handleToggleAAA(contact, e)}
                    onRemoveFromPool={() => setPauseDialogContact(contact)}
                    onRowClick={() => router.push(`/contacts/${contact.id}`)}
                    isEven={index % 2 === 0}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination Controls */}
      {contacts && contacts.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount} contact{totalCount !== 1 ? "s" : ""}
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1 px-2">
              <span className="text-sm font-medium">{page}</span>
              <span className="text-sm text-muted-foreground">of</span>
              <span className="text-sm font-medium">{totalPages}</span>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Single-contact Remove from dialer pool dialog */}
      {pauseDialogContact && (
        <DialerPoolDialog
          open={!!pauseDialogContact}
          onOpenChange={(open) => !open && setPauseDialogContact(null)}
          entityType="contact"
          entityId={pauseDialogContact.id}
          entityName={`${pauseDialogContact.first_name} ${pauseDialogContact.last_name || ""}`.trim() || "Contact"}
          isPaused={isEntityPaused(pauseDialogContact.dialer_paused_until)}
          pausedUntil={pauseDialogContact.dialer_paused_until}
          onSuccess={() => setPauseDialogContact(null)}
        />
      )}
    </div>
  );
}

// Cadence options for bulk set
const CADENCE_OPTIONS = [
  { value: "default", label: "Default (2-3 days)" },
  { value: "2", label: "2 days" },
  { value: "3", label: "3 days" },
  { value: "5", label: "5 days" },
  { value: "7", label: "1 week" },
  { value: "10", label: "10 days" },
  { value: "14", label: "2 weeks" },
];

// Bulk Actions Bar Component
function BulkActionsBar({ 
  selected, 
  onClearSelection 
}: { 
  selected: string[]; 
  onClearSelection: () => void;
}) {
  const [bulkStage, setBulkStage] = useState("");
  const [bulkCadence, setBulkCadence] = useState("");
  const [bulkRemoveValue, setBulkRemoveValue] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isReAdding, setIsReAdding] = useState(false);
  const updateContact = useUpdateContact();
  const bulkDeleteContacts = useBulkDeleteContacts();
  const { removeContactFromQueue } = useDialerStore();
  const queryClient = useQueryClient();
  const supabase = createClient();

  const handleBulkStageChange = async (newStage: string) => {
    if (!newStage || selected.length === 0) return;
    
    setIsUpdating(true);
    try {
      // Update all selected contacts
      await Promise.all(
        selected.map(id => 
          updateContact.mutateAsync({ id, updates: { stage: newStage } })
        )
      );
      
      const stageLabel = STAGES.find(s => s.value === newStage)?.label || newStage;
      toast.success(`${selected.length} contact${selected.length !== 1 ? "s" : ""} moved to ${stageLabel}`);
      onClearSelection();
      setBulkStage("");
    } catch (error) {
      toast.error("Failed to update some contacts");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkCadenceChange = async (cadence: string) => {
    if (!cadence || selected.length === 0) return;
    
    setIsUpdating(true);
    try {
      const cadenceDays = cadence === "default" ? null : parseInt(cadence);
      
      await Promise.all(
        selected.map(id => 
          updateContact.mutateAsync({ id, updates: { cadence_days: cadenceDays } })
        )
      );
      
      const label = CADENCE_OPTIONS.find(o => o.value === cadence)?.label || cadence;
      toast.success(`${selected.length} contact${selected.length !== 1 ? "s" : ""} set to ${label} cadence`);
      onClearSelection();
      setBulkCadence("");
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts-paginated"] });
    } catch (error) {
      toast.error("Failed to update some contacts");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDistributeStartDates = async () => {
    if (selected.length === 0) return;
    
    setIsScheduling(true);
    try {
      const response = await fetch("/api/dialer/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: selected }),
      });
      
      if (!response.ok) throw new Error("Failed to schedule");
      
      const result = await response.json();
      toast.success(
        `Distributed ${result.scheduled} contacts across ${result.distribution.length} business days`
      );
      onClearSelection();
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts-paginated"] });
    } catch (error) {
      toast.error("Failed to distribute contacts");
    } finally {
      setIsScheduling(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    
    setIsDeleting(true);
    try {
      await bulkDeleteContacts.mutateAsync(selected);
      // Remove from dialer queue
      selected.forEach(id => removeContactFromQueue(id));
      toast.success(`${selected.length} contact${selected.length !== 1 ? "s" : ""} deleted`);
      onClearSelection();
    } catch (error) {
      toast.error("Failed to delete some contacts");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkRemoveFromPool = async (months: number) => {
    if (selected.length === 0) return;
    setIsPausing(true);
    try {
      const pauseUntilDate = months === -1
        ? INDEFINITE_PAUSE_DATE
        : (() => {
            const d = new Date();
            d.setMonth(d.getMonth() + months);
            return d.toISOString().split("T")[0];
          })();
      const now = new Date().toISOString();

      const { data: nameRows } = await supabase
        .from("contacts")
        .select("id, first_name, last_name")
        .in("id", selected);
      const names = (nameRows || []).map((r) => ({
        id: r.id,
        entity_name: `${(r.first_name || "").trim()} ${(r.last_name || "").trim()}`.trim() || "Contact",
      }));

      const { error: updateError } = await supabase
        .from("contacts")
        .update({
          dialer_status: "paused",
          dialer_paused_until: pauseUntilDate,
          dialer_pause_reason_code: "bulk_action",
          dialer_pause_reason_notes: null,
          dialer_paused_at: now,
        })
        .in("id", selected);

      if (updateError) throw updateError;

      await supabase.from("dialer_pool_events").insert(
        names.map((n) => ({
          user_id: DEFAULT_USER_ID,
          entity_type: "contact" as const,
          contact_id: n.id,
          company_id: null,
          entity_name: n.entity_name,
          action: "paused" as const,
          paused_until: pauseUntilDate,
          duration_months: months === -1 ? null : months,
          reason_code: "bulk_action",
        }))
      );

      selected.forEach((id) => removeContactFromQueue(id));
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts-paginated"] });

      toast.success(
        `${selected.length} contact${selected.length !== 1 ? "s" : ""} removed from dialer pool${months === -1 ? " indefinitely" : ` until ${pauseUntilDate}`}`
      );
      setBulkRemoveValue("");
      onClearSelection();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to remove from dialer pool";
      toast.error(msg);
    } finally {
      setIsPausing(false);
    }
  };

  const handleBulkReAddToPool = async () => {
    if (selected.length === 0) return;
    setIsReAdding(true);
    try {
      const { data: rows } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, dialer_status, dialer_paused_until")
        .in("id", selected);

      const paused = (rows || []).filter((r) =>
        isEntityPaused(r.dialer_paused_until)
      );
      if (paused.length === 0) {
        toast.info("No selected contacts are currently paused");
        setIsReAdding(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("contacts")
        .update({
          dialer_status: "active",
          dialer_paused_until: null,
          dialer_pause_reason_code: null,
          dialer_pause_reason_notes: null,
          dialer_paused_at: null,
        })
        .in("id", paused.map((p) => p.id));

      if (updateError) throw updateError;

      await supabase.from("dialer_pool_events").insert(
        paused.map((p) => ({
          user_id: DEFAULT_USER_ID,
          entity_type: "contact" as const,
          contact_id: p.id,
          company_id: null,
          entity_name: `${(p.first_name || "").trim()} ${(p.last_name || "").trim()}`.trim() || "Contact",
          action: "unpaused" as const,
        }))
      );

      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts-paginated"] });

      toast.success(`${paused.length} contact${paused.length !== 1 ? "s" : ""} re-added to dialer pool`);
      onClearSelection();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to re-add to dialer pool";
      toast.error(msg);
    } finally {
      setIsReAdding(false);
    }
  };

  const isBulkBusy = isUpdating || isScheduling || isDeleting || isPausing || isReAdding;

  return (
    <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg animate-in slide-in-from-top-2 duration-200">
      <Badge variant="secondary" className="font-semibold">
        {selected.length} selected
      </Badge>
      
      <div className="flex items-center gap-2">
        {/* Change Stage Dropdown */}
        <Select 
          value={bulkStage} 
          onValueChange={(v) => {
            setBulkStage(v);
            handleBulkStageChange(v);
          }}
          disabled={isBulkBusy}
        >
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <Kanban className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Change Stage" />
          </SelectTrigger>
          <SelectContent>
            {STAGES.map((stage) => (
              <SelectItem key={stage.value} value={stage.value}>
                <div className="flex items-center gap-2">
                  <div className={cn("h-2 w-2 rounded-full", stage.color)} />
                  {stage.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Set Cadence Dropdown */}
        <Select 
          value={bulkCadence} 
          onValueChange={(v) => {
            setBulkCadence(v);
            handleBulkCadenceChange(v);
          }}
          disabled={isBulkBusy}
        >
          <SelectTrigger className="w-[150px] h-8 text-sm">
            <Repeat className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Set Cadence" />
          </SelectTrigger>
          <SelectContent>
            {CADENCE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Distribute Start Dates Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8"
          onClick={handleDistributeStartDates}
          disabled={isBulkBusy}
        >
          {isScheduling ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Calendar className="h-4 w-4 mr-1" />
          )}
          Distribute
        </Button>

        {/* Remove from dialer pool */}
        <Select
          value={bulkRemoveValue}
          onValueChange={(v) => {
            setBulkRemoveValue(v);
            handleBulkRemoveFromPool(parseInt(v, 10));
          }}
          disabled={isBulkBusy}
        >
          <SelectTrigger className="w-[180px] h-8 text-sm">
            {isPausing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin text-amber-500" />
            ) : (
              <PauseCircle className="h-4 w-4 mr-2 text-amber-500" />
            )}
            <SelectValue placeholder="Remove from pool" />
          </SelectTrigger>
          <SelectContent>
            {PAUSE_DURATION_OPTIONS.map((opt) => (
              <SelectItem key={opt.months} value={opt.months.toString()}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={handleBulkReAddToPool}
              disabled={isBulkBusy}
            >
              {isReAdding ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4 mr-1 text-emerald-600" />
              )}
              Re-add to pool
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Re-add selected paused contacts to dialer pool</TooltipContent>
        </Tooltip>

        <Button variant="outline" size="sm" className="h-8">
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
        
        <AlertDialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-destructive hover:bg-destructive/10"
                  disabled={isBulkBusy}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  Delete
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">Delete selected contacts</TooltipContent>
          </Tooltip>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selected.length} contact{selected.length !== 1 ? "s" : ""}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the selected contacts and all their related data (calls, notes, tasks). This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete {selected.length} Contact{selected.length !== 1 ? "s" : ""}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      
      <Button 
        variant="ghost" 
        size="sm"
        onClick={onClearSelection}
        className="ml-auto h-8"
      >
        Clear selection
      </Button>
    </div>
  );
}

function ContactRow({
  contact,
  selected,
  onSelect,
  onCopyPhone,
  onCopyEmail,
  onDelete,
  onToggleAAA,
  onRemoveFromPool,
  onRowClick,
  isEven,
}: {
  contact: Contact;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onCopyPhone: (e: React.MouseEvent) => void;
  onCopyEmail: (e: React.MouseEvent) => void;
  onDelete: () => void;
  onToggleAAA: (e: React.MouseEvent) => void;
  onRemoveFromPool: (contact: Contact) => void;
  onRowClick: () => void;
  isEven: boolean;
}) {
  const stage = STAGES.find((s) => s.value === contact.stage);
  const contactName = `${contact.first_name} ${contact.last_name || ''}`.trim();
  const isPaused = isEntityPaused(contact.dialer_paused_until);

  return (
    <TableRow 
      className={cn(
        "group cursor-pointer transition-all duration-150",
        "hover:bg-primary/5",
        selected && "bg-primary/10",
        contact.is_aaa && "bg-amber-500/5",
        isPaused && "bg-amber-500/5"
      )}
      onClick={onRowClick}
    >
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selected} onCheckedChange={onSelect} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                {getInitials(contactName)}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={onToggleAAA}
              className="absolute -top-1 -right-1 p-0.5 rounded-full bg-background border shadow-sm hover:bg-muted transition-colors"
            >
              <Star 
                className={cn(
                  "h-3 w-3",
                  contact.is_aaa 
                    ? "fill-amber-500 text-amber-500" 
                    : "text-muted-foreground/50 hover:text-amber-500"
                )} 
              />
            </button>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{contactName}</p>
              {isPaused && (
                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-400 shrink-0">
                  Paused
                </Badge>
              )}
            </div>
            {contact.title && (
              <p className="text-xs text-muted-foreground truncate">{contact.title}</p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="min-w-0">
          <p className="font-medium truncate">{contact.company_name || "—"}</p>
          {contact.industry && (
            <p className="text-xs text-muted-foreground truncate">{contact.industry}</p>
          )}
        </div>
      </TableCell>
      <TableCell>
        {contact.phone ? (
          <button
            onClick={onCopyPhone}
            className="text-sm font-mono hover:text-primary flex items-center gap-1.5 transition-colors group/phone"
          >
            {formatPhone(contact.phone)}
            <Copy className="h-3 w-3 opacity-0 group-hover/phone:opacity-100 transition-opacity" />
          </button>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>
      <TableCell>
        {contact.email ? (
          <button
            onClick={onCopyEmail}
            className="text-sm hover:text-primary flex items-center gap-1.5 truncate max-w-[180px] transition-colors group/email"
          >
            <span className="truncate">{contact.email}</span>
            <Copy className="h-3 w-3 opacity-0 group-hover/email:opacity-100 shrink-0 transition-opacity" />
          </button>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>
      <TableCell>
        <StageBadge 
          stage={contact.stage as "fresh" | "contacted" | "qualified" | "meeting" | "proposal" | "won" | "lost"} 
          className="shadow-sm"
        />
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        {/* Inline Actions - Always visible on hover */}
        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`/contacts/${contact.id}`}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Eye className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">View</TooltipContent>
          </Tooltip>

          {contact.phone && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`/dialer?contact=${contact.id}`}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10">
                    <Phone className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top">Call</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFromPool(contact);
                }}
              >
                {isPaused ? (
                  <PlayCircle className="h-4 w-4" />
                ) : (
                  <PauseCircle className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{isPaused ? "Re-add to dialer pool" : "Remove from dialer pool"}</TooltipContent>
          </Tooltip>

          {contact.email && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-500/10">
                  <Mail className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Email</TooltipContent>
            </Tooltip>
          )}

          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">Delete</TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {contactName}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}
