"use client";

import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { useContact, useUpdateContact, useDeleteContact } from "@/hooks/use-contacts";
import { useTasks, useDeleteTask } from "@/hooks/use-tasks";
import type { Task } from "@/types/database";
import { useCreateNote } from "@/hooks/use-notes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ActivityTimeline } from "@/components/contacts/activity-timeline";
import { ContactForm } from "@/components/contacts/contact-form";
import { GroupedNotesTimeline } from "@/components/contacts/grouped-notes-timeline";
import { MeetingsList } from "@/components/meetings/meetings-list";
import { MeetingDialog } from "@/components/dialer/meeting-dialog";
import { TaskForm } from "@/components/tasks/task-form";
import { STAGES } from "@/lib/constants";
import { DEFAULT_USER_ID } from "@/lib/default-user";
import { formatPhone, copyToClipboard, getInitials } from "@/lib/utils";
import {
  Phone,
  Mail,
  Linkedin,
  Building2,
  MapPin,
  Copy,
  Pencil,
  Trash2,
  CheckSquare,
  MessageSquare,
  ExternalLink,
  Calendar,
  Repeat,
  AlertCircle,
  Star,
  PauseCircle,
  PlayCircle,
} from "lucide-react";
import { DialerPoolDialog, isEntityPaused, isIndefinitePause } from "@/components/dialer/dialer-pool-dialog";
import { useDialerStore } from "@/stores/dialer-store";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";
import { AbuButton } from "@/components/ui/abu-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const contactId = params.id as string;

  const { data: contact, isLoading, refetch: refetchContact } = useContact(contactId);
  const { data: tasksData } = useTasks({ contactId, status: "todo", limit: 5 });
  const tasks = (tasksData ?? []) as Task[];
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const createNote = useCreateNote();
  const deleteTask = useDeleteTask();
  const { removeContactFromQueue } = useDialerStore();

  const [editOpen, setEditOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const userId = DEFAULT_USER_ID;
  
  // Check if contact is paused via the structured pause feature
  const contactIsPaused = contact ? isEntityPaused(contact.dialer_paused_until) : false;

  const handleCopy = async (text: string, type: string) => {
    await copyToClipboard(text);
    toast.success(`${type} copied!`);
  };

  const handleUpdate = async (data: any) => {
    try {
      const { note, ...updates } = data;
      await updateContact.mutateAsync({
        id: contactId,
        updates,
      });
      toast.success("Contact updated!");
      setEditOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteContact.mutateAsync(contactId);
      // Remove from dialer queue if present
      removeContactFromQueue(contactId);
      toast.success("Contact deleted");
      router.push("/contacts");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  };

  const handleQualificationChange = async (field: string, value: boolean) => {
    await updateContact.mutateAsync({
      id: contactId,
      updates: { [field]: value },
    });
  };

  const handleStageChange = async (newStage: string) => {
    const previousStage = contact?.stage;
    try {
      await updateContact.mutateAsync({
        id: contactId,
        updates: { stage: newStage },
      });
      toast.success(`Stage updated to ${STAGES.find(s => s.value === newStage)?.label || newStage}`, {
        action: previousStage ? {
          label: "Undo",
          onClick: async () => {
            try {
              await updateContact.mutateAsync({
                id: contactId,
                updates: { stage: previousStage },
              });
              toast.success("Stage change undone");
            } catch {
              toast.error("Failed to undo stage change");
            }
          },
        } : undefined,
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to update stage");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Contact" />
        <div className="p-6 space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Contact" />
        <div className="p-6">
          <p>Contact not found</p>
          <Link href="/contacts">
            <Button variant="link">Back to contacts</Button>
          </Link>
        </div>
      </div>
    );
  }

  const stage = STAGES.find((s) => s.value === contact.stage);
  const qualificationScore =
    [contact.has_budget, contact.is_authority, contact.has_need, contact.has_timeline]
      .filter(Boolean).length * 25;

  return (
    <div className="flex flex-col h-full">
      <Header title={`${contact.first_name} ${contact.last_name || ""}`} />

      <div className="flex-1 p-6 overflow-auto">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: "Contacts", href: "/contacts" },
            { label: `${contact.first_name} ${contact.last_name || ""}`.trim() },
          ]}
          className="mb-6"
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Header Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="text-lg">
                        {getInitials(`${contact.first_name} ${contact.last_name || ""}`)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold">
                          {contact.first_name} {contact.last_name}
                        </h2>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => {
                                updateContact.mutate(
                                  { id: contact.id, updates: { is_aaa: !contact.is_aaa } },
                                  {
                                    onSuccess: () => {
                                      toast.success(contact.is_aaa ? "Removed AAA status" : "Marked as AAA priority");
                                    },
                                    onError: () => toast.error("Failed to update AAA status"),
                                  }
                                );
                              }}
                              className="p-1 rounded hover:bg-muted transition-colors"
                            >
                              <Star 
                                className={cn(
                                  "h-5 w-5 transition-colors",
                                  contact.is_aaa 
                                    ? "fill-amber-500 text-amber-500" 
                                    : "text-muted-foreground hover:text-amber-500"
                                )} 
                              />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {contact.is_aaa ? "Remove AAA priority" : "Mark as AAA priority"}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      {contact.title && (
                        <p className="text-muted-foreground">{contact.title}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {/* Inline Stage Selector */}
                        <Select value={contact.stage || "fresh"} onValueChange={handleStageChange}>
                          <SelectTrigger className="h-7 w-auto gap-1.5 border-0 bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 px-0">
                            <div className="flex items-center gap-1.5">
                              <span className={cn("h-2.5 w-2.5 rounded-full", stage?.color || "bg-slate-500")} />
                              <SelectValue>
                                <span className="font-medium text-sm">{stage?.label || contact.stage}</span>
                              </SelectValue>
                            </div>
                          </SelectTrigger>
                          <SelectContent align="start">
                            {STAGES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                <div className="flex items-center gap-2">
                                  <span className={cn("h-2.5 w-2.5 rounded-full", s.color)} />
                                  <span>{s.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {contact.tags?.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={() => setEditOpen(true)} aria-label="Edit contact">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit contact</TooltipContent>
                    </Tooltip>
                    <AlertDialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="icon" aria-label="Delete contact">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Delete contact</TooltipContent>
                      </Tooltip>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this contact? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid gap-4 mt-6 sm:grid-cols-2">
                  {contact.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <button
                        onClick={() => handleCopy(contact.phone!, "Phone")}
                        className="text-sm hover:text-primary hover:underline flex items-center gap-1"
                      >
                        {formatPhone(contact.phone)}
                        <Copy className="h-3 w-3 opacity-50" />
                      </button>
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <button
                        onClick={() => handleCopy(contact.email!, "Email")}
                        className="text-sm hover:text-primary hover:underline flex items-center gap-1"
                      >
                        {contact.email}
                        <Copy className="h-3 w-3 opacity-50" />
                      </button>
                    </div>
                  )}
                  {contact.linkedin_url && (
                    <div className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={contact.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm hover:text-primary hover:underline flex items-center gap-1"
                      >
                        LinkedIn
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {contact.company_name && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {contact.company_name}
                        {contact.employee_range && ` (${contact.employee_range})`}
                      </span>
                    </div>
                  )}
                  {(contact.city || contact.state) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {[contact.city, contact.state].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 mt-6 flex-wrap">
                  <Link href={`/dialer?contact=${contact.id}`}>
                    <Button>
                      <Phone className="mr-2 h-4 w-4" />
                      Call
                    </Button>
                  </Link>
                  <Button variant="outline">
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </Button>
                  <Button variant="outline" onClick={() => setMeetingOpen(true)}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Meeting
                  </Button>
                  <AbuButton contactName={`${contact.first_name} ${contact.last_name || ''}`.trim()} />
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="activity">
              <TabsList>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="meetings">Meetings</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="emails">Emails</TabsTrigger>
              </TabsList>
              <TabsContent value="activity" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <ActivityTimeline contactId={contactId} />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="meetings" className="mt-4">
                <MeetingsList
                  contactId={contactId}
                  userId={userId}
                  title="Meetings"
                  showScheduleButton={true}
                  onScheduleClick={() => setMeetingOpen(true)}
                />
              </TabsContent>
              <TabsContent value="notes" className="mt-4">
                <Card>
                  <CardContent className="pt-6 space-y-6">
                    {/* Add Note Form */}
                    <div className="space-y-2 pb-4 border-b">
                      <Textarea
                        placeholder="Add a note..."
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
                              contact_id: contactId,
                              content: newNoteText.trim(),
                              is_pinned: false,
                              is_company_wide: false,
                            });
                            setNewNoteText("");
                            toast.success("Note added!");
                          } catch (error: any) {
                            toast.error(error.message || "Failed to add note");
                          }
                        }}
                      >
                        {createNote.isPending ? "Adding..." : "Add Note"}
                      </Button>
                    </div>
                    
                    {/* Grouped Notes Timeline - shows all notes including call notes */}
                    <GroupedNotesTimeline 
                      contactId={contactId} 
                      companyId={contact.company_id}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="emails" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground text-center py-8">
                      Email history coming soon
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Qualification */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Qualification (BANT)
                  <span className="text-sm font-normal text-muted-foreground">
                    {qualificationScore}%
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={contact.has_budget}
                    onCheckedChange={(checked) =>
                      handleQualificationChange("has_budget", !!checked)
                    }
                  />
                  <span className="text-sm">Budget confirmed</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={contact.is_authority}
                    onCheckedChange={(checked) =>
                      handleQualificationChange("is_authority", !!checked)
                    }
                  />
                  <span className="text-sm">Decision maker</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={contact.has_need}
                    onCheckedChange={(checked) =>
                      handleQualificationChange("has_need", !!checked)
                    }
                  />
                  <span className="text-sm">Need identified</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={contact.has_timeline}
                    onCheckedChange={(checked) =>
                      handleQualificationChange("has_timeline", !!checked)
                    }
                  />
                  <span className="text-sm">Timeline established</span>
                </div>
              </CardContent>
            </Card>

            {/* Personal Connector */}
            {contact.direct_referral_note && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Personal Connector</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{contact.direct_referral_note}</p>
                </CardContent>
              </Card>
            )}

            {/* Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Tasks
                  <Button variant="ghost" size="sm" onClick={() => setTaskFormOpen(true)}>
                    + Add
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No open tasks
                  </p>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-2 text-sm group">
                        <Checkbox />
                        <span className="truncate flex-1">{task.title}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              onClick={() => {
                                deleteTask.mutate(task.id, {
                                  onSuccess: () => toast.success("Task deleted"),
                                  onError: () => toast.error("Failed to delete task"),
                                });
                              }}
                              aria-label="Delete task"
                            >
                              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete task</TooltipContent>
                        </Tooltip>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Stats</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{contact.total_calls}</p>
                  <p className="text-xs text-muted-foreground">Calls</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{contact.total_emails}</p>
                  <p className="text-xs text-muted-foreground">Emails</p>
                </div>
              </CardContent>
            </Card>

            {/* Calling Cadence */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Repeat className="h-4 w-4" />
                    Calling Cadence
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPauseDialogOpen(true)}
                    className={cn(
                      "h-7 text-xs",
                      contactIsPaused 
                        ? "text-emerald-600 hover:text-emerald-700" 
                        : "text-amber-600 hover:text-amber-700"
                    )}
                  >
                    {contactIsPaused ? (
                      <>
                        <PlayCircle className="h-3.5 w-3.5 mr-1" />
                        Re-add
                      </>
                    ) : (
                      <>
                        <PauseCircle className="h-3.5 w-3.5 mr-1" />
                        Remove
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Dialer Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select 
                    value={contact.dialer_status || "active"} 
                    onValueChange={async (value) => {
                      try {
                        await updateContact.mutateAsync({
                          id: contactId,
                          updates: { 
                            dialer_status: value,
                            // Clear pause date if setting to active
                            dialer_paused_until: value === "active" ? null : contact.dialer_paused_until,
                          },
                        });
                        toast.success(`Status updated to ${value}`);
                      } catch (error: any) {
                        toast.error(error.message || "Failed to update status");
                      }
                    }}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </SelectItem>
                      <SelectItem value="paused">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          Paused
                        </span>
                      </SelectItem>
                      <SelectItem value="exhausted">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-slate-400" />
                          Exhausted
                        </span>
                      </SelectItem>
                      <SelectItem value="converted">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                          Converted
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Paused Until (only show if paused) */}
                {contact.dialer_status === "paused" && contact.dialer_paused_until && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>
                      {isIndefinitePause(contact.dialer_paused_until)
                        ? "Paused indefinitely"
                        : `Paused until ${new Date(contact.dialer_paused_until).toLocaleDateString()}`}
                    </span>
                  </div>
                )}

                {/* Next Call Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Next Call Date</label>
                  <div className="text-sm font-medium">
                    {contact.next_call_date 
                      ? new Date(contact.next_call_date).toLocaleDateString()
                      : "Never called"}
                  </div>
                </div>

                {/* Cadence */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Call Every</label>
                  <Select 
                    value={contact.cadence_days?.toString() || "default"} 
                    onValueChange={async (value) => {
                      try {
                        await updateContact.mutateAsync({
                          id: contactId,
                          updates: { 
                            cadence_days: value === "default" ? null : parseInt(value),
                          },
                        });
                        toast.success(value === "default" ? "Using default cadence" : `Cadence set to ${value} days`);
                      } catch (error: any) {
                        toast.error(error.message || "Failed to update cadence");
                      }
                    }}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Default (2-3 days)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default (2-3 days)</SelectItem>
                      <SelectItem value="2">2 days</SelectItem>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="5">5 days</SelectItem>
                      <SelectItem value="7">1 week</SelectItem>
                      <SelectItem value="14">2 weeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Call Attempts Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">Call Attempts</label>
                    <span className="text-xs text-muted-foreground">
                      {contact.total_calls || 0} / 10
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all",
                        (contact.total_calls || 0) >= 10 
                          ? "bg-slate-400" 
                          : (contact.total_calls || 0) >= 7 
                            ? "bg-amber-500" 
                            : "bg-emerald-500"
                      )}
                      style={{ width: `${Math.min(((contact.total_calls || 0) / 10) * 100, 100)}%` }}
                    />
                  </div>
                  {(contact.total_calls || 0) >= 10 && (
                    <p className="text-xs text-muted-foreground">Max attempts reached</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <ContactForm
            contact={contact}
            onSubmit={handleUpdate}
            isLoading={updateContact.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Meeting Dialog */}
      <MeetingDialog
        open={meetingOpen}
        onOpenChange={setMeetingOpen}
        contact={contact}
        userId={userId}
      />

      {/* Task Form Dialog */}
      <TaskForm
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        defaultContactId={contactId}
      />

      {/* Dialer Pool Dialog */}
      <DialerPoolDialog
        open={pauseDialogOpen}
        onOpenChange={setPauseDialogOpen}
        entityType="contact"
        entityId={contactId}
        entityName={`${contact.first_name} ${contact.last_name || ""}`.trim()}
        isPaused={contactIsPaused}
        pausedUntil={contact.dialer_paused_until}
        onSuccess={() => {
          refetchContact();
          queryClient.invalidateQueries({ queryKey: ["contacts"] });
        }}
      />
    </div>
  );
}
