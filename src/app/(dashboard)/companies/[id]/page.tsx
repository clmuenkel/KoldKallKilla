"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCompany, useCompanyCallHistory, useDeleteCompany } from "@/hooks/use-companies";
import { useQueryClient } from "@tanstack/react-query";
import { useCompanyNotes, useCreateNote, useDeleteNote } from "@/hooks/use-notes";
import { CompanyCard, CompanyCardSkeleton } from "@/components/companies/company-card";
import { CompanyContacts } from "@/components/companies/company-contacts";
import { CompanyCallHistory } from "@/components/companies/company-call-history";
import { MeetingsList } from "@/components/meetings/meetings-list";
import { DialerPoolDialog, isEntityPaused, isIndefinitePause } from "@/components/dialer/dialer-pool-dialog";
import { useDialerStore } from "@/stores/dialer-store";
import { DEFAULT_USER_ID } from "@/lib/default-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { 
  Users, 
  Phone, 
  Upload,
  History,
  Calendar,
  StickyNote,
  Trash2,
  Star,
  PauseCircle,
  PlayCircle,
} from "lucide-react";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const companyId = params.id as string;

  const userId = DEFAULT_USER_ID;
  const { data: company, isLoading: loadingCompany, refetch: refetchCompany } = useCompany(companyId);
  const { data: callHistory, isLoading: loadingCalls } = useCompanyCallHistory(companyId);
  const { data: companyNotes } = useCompanyNotes(companyId);
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const deleteCompany = useDeleteCompany();
  const { removeCompanyContactsFromQueue } = useDialerStore();
  const [newNoteText, setNewNoteText] = useState("");
  
  // Dialog states
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const handleStartCall = (contactId: string) => {
    router.push(`/dialer?contact=${contactId}`);
  };

  const handleDeleteCompany = async () => {
    if (!company) return;
    try {
      await deleteCompany.mutateAsync(companyId);
      // Remove all company contacts from dialer queue
      removeCompanyContactsFromQueue(companyId);
      toast.success(`Company "${company.name}" and all related data deleted`);
      router.push("/companies");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete company");
    }
  };

  // Check if company is paused
  const companyIsPaused = company ? isEntityPaused(company.dialer_paused_until) : false;

  if (loadingCompany) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <CompanyCardSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Company not found</p>
        <Link href="/companies">
          <Button variant="link">Go back to companies</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Companies", href: "/companies" },
          { label: company.name },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{company.name}</h1>
            {companyIsPaused && (
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                <PauseCircle className="h-3 w-3 mr-1" />
                {isIndefinitePause(company.dialer_paused_until) 
                  ? "Paused indefinitely" 
                  : `Paused until ${new Date(company.dialer_paused_until!).toLocaleDateString()}`}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">{company.domain}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Pause/Unpause from dialer pool */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPauseDialogOpen(true)}
              >
                {companyIsPaused ? (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2 text-emerald-500" />
                    Re-add to Pool
                  </>
                ) : (
                  <>
                    <PauseCircle className="h-4 w-4 mr-2 text-amber-500" />
                    Remove from Pool
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {companyIsPaused 
                ? "Re-add all contacts from this company to the dialer queue"
                : "Remove all contacts from this company from the dialer queue"
              }
            </TooltipContent>
          </Tooltip>

          <Link href={`/import?company=${company.domain}`}>
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import Contacts
            </Button>
          </Link>
          
          {/* Delete company */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete company and all related data</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Company Card */}
      <CompanyCard 
        company={company} 
        contactCount={company.contact_count}
        lastContactedAt={company.last_contacted_at}
      />

      {/* Tabs */}
      {(() => {
        const aaaContacts = company.contacts?.filter(c => c.is_aaa) || [];
        const aaaCount = aaaContacts.length;
        return (
          <Tabs defaultValue="contacts" className="space-y-4">
            <TabsList>
              <TabsTrigger value="contacts" className="gap-2">
                <Users className="h-4 w-4" />
                Contacts ({company.contacts?.length || 0})
              </TabsTrigger>
              {aaaCount > 0 && (
                <TabsTrigger value="aaa" className="gap-2">
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                  AAA ({aaaCount})
                </TabsTrigger>
              )}
              <TabsTrigger value="meetings" className="gap-2">
                <Calendar className="h-4 w-4" />
                Meetings
              </TabsTrigger>
              <TabsTrigger value="calls" className="gap-2">
                <History className="h-4 w-4" />
                Call History
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-2">
                <StickyNote className="h-4 w-4" />
                Notes ({companyNotes?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="contacts">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Contacts at {company.name}</span>
                    <Link href={`/contacts/new?company=${company.id}`}>
                      <Button variant="outline" size="sm">
                        Add Contact
                      </Button>
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CompanyContacts 
                    contacts={company.contacts || []}
                    onStartCall={handleStartCall}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {aaaCount > 0 && (
              <TabsContent value="aaa">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
                      AAA Priority Contacts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CompanyContacts 
                      contacts={aaaContacts}
                      onStartCall={handleStartCall}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="meetings">
              <MeetingsList
                companyId={companyId}
                userId={userId}
                title={`Meetings with ${company.name}`}
                showScheduleButton={false}
              />
            </TabsContent>

            <TabsContent value="calls">
              <Card>
                <CardHeader>
                  <CardTitle>Call History</CardTitle>
                </CardHeader>
                <CardContent>
                  <CompanyCallHistory 
                    calls={callHistory || []}
                    isLoading={loadingCalls}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes">
              <Card>
                <CardHeader>
                  <CardTitle>Company Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add Note Form */}
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a company-wide note..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      rows={3}
                    />
                    <Button
                      size="sm"
                      disabled={!newNoteText.trim() || createNote.isPending}
                      onClick={async () => {
                        try {
                          await createNote.mutateAsync({
                            user_id: userId,
                            company_id: companyId,
                            content: newNoteText.trim(),
                            is_pinned: false,
                            is_company_wide: true,
                          });
                          setNewNoteText("");
                          toast.success("Company note added!");
                        } catch (error: any) {
                          toast.error(error.message || "Failed to add note");
                        }
                      }}
                    >
                      {createNote.isPending ? "Adding..." : "Add Note"}
                    </Button>
                  </div>
                  
                  {/* Notes List */}
                  {!companyNotes || companyNotes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No company notes yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {companyNotes.map((note) => (
                        <div key={note.id} className="border-b pb-3 last:border-b-0 group">
                          <div className="flex justify-between items-start gap-2">
                            <p className="text-sm whitespace-pre-wrap flex-1">{note.content}</p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                  onClick={() => {
                                    deleteNote.mutate(note.id, {
                                      onSuccess: () => toast.success("Note deleted"),
                                      onError: () => toast.error("Failed to delete note"),
                                    });
                                  }}
                                >
                                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete note</TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {new Date(note.created_at).toLocaleDateString()} at{" "}
                              {new Date(note.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {note.is_pinned && (
                              <Badge variant="secondary" className="text-xs">Pinned</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        );
      })()}

      {/* Talked To Section */}
      {company.talked_to && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reference Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">
                  {company.talked_to.first_name} {company.talked_to.last_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {company.talked_to.title}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Last spoke: {company.talked_to.last_contacted_at 
                  ? new Date(company.talked_to.last_contacted_at).toLocaleDateString()
                  : "Never"}
              </p>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Use this person as a reference when calling other contacts at this company.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialer Pool Dialog */}
      <DialerPoolDialog
        open={pauseDialogOpen}
        onOpenChange={setPauseDialogOpen}
        entityType="company"
        entityId={companyId}
        entityName={company.name}
        isPaused={companyIsPaused}
        pausedUntil={company.dialer_paused_until}
        onSuccess={() => {
          refetchCompany();
          queryClient.invalidateQueries({ queryKey: ["companies"] });
        }}
      />

      {/* Delete Company Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete Company</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  This will permanently delete <strong>{company.name}</strong> and all related data:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>{company.contact_count || 0} contacts</li>
                  <li>All calls, notes, tasks, and meetings</li>
                  <li>All activity history</li>
                </ul>
                <p className="font-medium">This action cannot be undone.</p>
                <div className="pt-2">
                  <p className="text-sm mb-2">Type <strong>{company.name}</strong> to confirm:</p>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={company.name}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCompany}
              disabled={deleteConfirmText !== company.name || deleteCompany.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCompany.isPending ? "Deleting..." : "Delete Company"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
