"use client";

import { useState } from "react";
import { usePaginatedCompanies, useDeleteCompany } from "@/hooks/use-companies";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useDialerStore } from "@/stores/dialer-store";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { DialerPoolDialog, isEntityPaused } from "@/components/dialer/dialer-pool-dialog";
import { createClient } from "@/lib/supabase/client";
import { useAuthId } from "@/hooks/use-auth";
import { getFriendlyTimezoneName } from "@/lib/timezone";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  Search, 
  Building2, 
  Users, 
  Clock, 
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
  Eye,
  PauseCircle,
  Download,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CompanyWithStats } from "@/hooks/use-companies";

const INDUSTRY_FILTERS = [
  { value: "all", label: "All Industries" },
  { value: "credit_union", label: "Credit Unions" },
  { value: "hospital", label: "Hospitals" },
  { value: "healthcare", label: "Healthcare" },
  { value: "bank", label: "Banking" },
  { value: "financial_services", label: "Financial Services" },
];

export function CompanyList() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [industryFilter, setIndustryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const pageSize = 50;
  const router = useRouter();
  const queryClient = useQueryClient();
  const deleteCompany = useDeleteCompany();
  const { removeCompanyContactsFromQueue } = useDialerStore();

  const { data: paginatedData, isLoading, refetch } = usePaginatedCompanies({
    search: debouncedSearch || undefined,
    industry: industryFilter !== "all" ? industryFilter : undefined,
    page,
    pageSize,
  });

  const companies = paginatedData?.data;
  const totalCount = paginatedData?.totalCount || 0;
  const totalPages = paginatedData?.totalPages || 1;

  // Reset page when filters change
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleIndustryChange = (value: string) => {
    setIndustryFilter(value);
    setPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(companies?.map((c) => c.id) || []);
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

  const handleDeleteCompany = async (company: CompanyWithStats) => {
    try {
      await deleteCompany.mutateAsync(company.id);
      // Remove all company contacts from dialer queue
      removeCompanyContactsFromQueue(company.id);
      toast.success(`Company "${company.name}" deleted`);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete company");
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={industryFilter} onValueChange={handleIndustryChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by industry" />
          </SelectTrigger>
          <SelectContent>
            {INDUSTRY_FILTERS.map((filter) => (
              <SelectItem key={filter.value} value={filter.value}>
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions Bar */}
      {selected.length > 0 && (
        <BulkActionsBar
          selected={selected}
          companies={companies || []}
          onClearSelection={() => setSelected([])}
          onSuccess={() => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ["companies"] });
          }}
        />
      )}

      {/* Table */}
      {isLoading ? (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/30">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selected.length === companies?.length && companies?.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-center">Contacts</TableHead>
                <TableHead>Last Contacted</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!companies || companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState
                      icon={Building2}
                      title="No companies found"
                      description={search ? "Try adjusting your search" : "Import companies from Apollo or add them manually"}
                      action={
                        !search && (
                          <Link href="/import">
                            <Button variant="outline" size="sm">
                              Import from Apollo
                            </Button>
                          </Link>
                        )
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((company) => (
                  <CompanyRow
                    key={company.id}
                    company={company}
                    selected={selected.includes(company.id)}
                    onSelect={(checked) => handleSelect(company.id, checked)}
                    onDelete={() => handleDeleteCompany(company)}
                    onClick={() => router.push(`/companies/${company.id}`)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination Controls */}
      {companies && companies.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount} compan{totalCount !== 1 ? "ies" : "y"}
          </p>
          
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  aria-label="First page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>First page</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Previous page</TooltipContent>
            </Tooltip>
            
            <div className="flex items-center gap-1 px-2">
              <span className="text-sm font-medium">{page}</span>
              <span className="text-sm text-muted-foreground">of</span>
              <span className="text-sm font-medium">{totalPages}</span>
            </div>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Next page</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                  aria-label="Last page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Last page</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
}

// Bulk Actions Bar Component
function BulkActionsBar({
  selected,
  companies,
  onClearSelection,
  onSuccess,
}: {
  selected: string[];
  companies: CompanyWithStats[];
  onClearSelection: () => void;
  onSuccess: () => void;
}) {
  const [isPausing, setIsPausing] = useState(false);
  const supabase = createClient();
  const userId = useAuthId()!;

  const handleBulkPause = async (months: number) => {
    setIsPausing(true);
    try {
      const pauseUntilDate = new Date();
      pauseUntilDate.setMonth(pauseUntilDate.getMonth() + months);
      const pauseUntilStr = pauseUntilDate.toISOString().split("T")[0];
      const now = new Date().toISOString();

      // Update all selected companies
      const { error } = await supabase
        .from("companies")
        .update({
          dialer_paused_until: pauseUntilStr,
          dialer_pause_reason_code: "bulk_action",
          dialer_paused_at: now,
        })
        .in("id", selected);

      if (error) throw error;

      // Log events
      const selectedCompanies = companies.filter(c => selected.includes(c.id));
      await supabase.from("dialer_pool_events").insert(
        selectedCompanies.map(company => ({
          user_id: userId,
          entity_type: "company" as const,
          company_id: company.id,
          entity_name: company.name,
          action: "paused" as const,
          paused_until: pauseUntilStr,
          duration_months: months,
          reason_code: "bulk_action",
        }))
      );

      toast.success(`${selected.length} companies paused from dialer pool`);
      onClearSelection();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to pause companies");
    } finally {
      setIsPausing(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg animate-in slide-in-from-top-2 duration-200">
      <Badge variant="secondary" className="font-semibold">
        {selected.length} selected
      </Badge>
      
      <div className="flex items-center gap-2">
        {/* Pause from Pool */}
        <Select 
          onValueChange={(v) => handleBulkPause(parseInt(v))}
          disabled={isPausing}
        >
          <SelectTrigger className="w-[180px] h-8 text-sm">
            <PauseCircle className="h-4 w-4 mr-2 text-amber-500" />
            <SelectValue placeholder="Remove from Pool" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Pause for 1 month</SelectItem>
            <SelectItem value="3">Pause for 3 months</SelectItem>
            <SelectItem value="6">Pause for 6 months</SelectItem>
            <SelectItem value="12">Pause for 1 year</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" className="h-8">
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
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

function CompanyRow({
  company,
  selected,
  onSelect,
  onDelete,
  onClick,
}: {
  company: CompanyWithStats;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onDelete: () => void;
  onClick: () => void;
}) {
  const location = [company.city, company.state].filter(Boolean).join(", ");
  const timezoneDisplay = company.timezone 
    ? getFriendlyTimezoneName(company.timezone)
    : null;
  const isPaused = isEntityPaused(company.dialer_paused_until);

  return (
    <TableRow 
      className={cn(
        "group cursor-pointer transition-colors",
        selected && "bg-primary/10",
        isPaused && "bg-amber-500/5"
      )}
      onClick={onClick}
    >
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selected} onCheckedChange={onSelect} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center relative">
            <Building2 className="h-5 w-5 text-primary" />
            {isPaused && (
              <div className="absolute -top-1 -right-1 h-4 w-4 bg-amber-500 rounded-full flex items-center justify-center">
                <PauseCircle className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{company.name}</p>
              {isPaused && (
                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 bg-amber-50">
                  Paused
                </Badge>
              )}
            </div>
            {company.domain && (
              <p className="text-sm text-muted-foreground">{company.domain}</p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        {company.industry ? (
          <Badge variant="outline">{company.industry}</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        {company.employee_range ? (
          <span className="text-sm">{company.employee_range}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 text-sm">
          {location ? (
            <>
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <span>{location}</span>
              {timezoneDisplay && (
                <span className="text-muted-foreground ml-1">({timezoneDisplay})</span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{company.contact_count}</span>
        </div>
      </TableCell>
      <TableCell>
        {company.last_contacted_at ? (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(company.last_contacted_at), { addSuffix: true })}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Never</span>
        )}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`/companies/${company.id}`}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Eye className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">View</TooltipContent>
          </Tooltip>

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
                <AlertDialogTitle>Delete Company</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete <strong>{company.name}</strong>?
                  This will also delete {company.contact_count} contact{company.contact_count !== 1 ? "s" : ""} and all related data.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}
