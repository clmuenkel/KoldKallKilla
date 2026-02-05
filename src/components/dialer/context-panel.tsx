"use client";

import { useCompany, useCompanyColleagues, useCompanyTalkedTo } from "@/hooks/use-companies";
import { useContactContext, formatReferralContext, formatOpenerSuggestion } from "@/hooks/use-referrals";
import { useCompanyNotes, useDeleteNote, useRecentNotes, useToggleNotePin } from "@/hooks/use-notes";
import { CompanyCard } from "@/components/companies/company-card";
import { CompanyContactsMini } from "@/components/companies/company-contacts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTimezoneDisplay, getFriendlyTimezoneName, isBusinessHours } from "@/lib/timezone";
import { 
  Building2, 
  Users, 
  MessageSquare, 
  Clock,
  Copy,
  Check,
  Edit2,
  ChevronRight,
  StickyNote,
  Trash2,
  Pin,
  PinOff,
  Phone,
  History,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import type { Contact, Company } from "@/types/database";

interface ContextPanelProps {
  contact: Contact;
  onSelectContact?: (contact: Contact) => void;
}

export function ContextPanel({ contact, onSelectContact }: ContextPanelProps) {
  const { data: company, isLoading: loadingCompany } = useCompany(contact.company_id || "");
  const { data: context, isLoading: loadingContext } = useContactContext(
    contact.id, 
    contact.company_id
  );
  const { data: colleagues } = useCompanyColleagues(contact.id, contact.company_id);
  const { data: companyNotes } = useCompanyNotes(contact.company_id);
  const { data: recentNotes } = useRecentNotes(contact.id, contact.company_id, 8);
  const deleteNote = useDeleteNote();
  const togglePin = useToggleNotePin();

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [manualReference, setManualReference] = useState("");
  const [isEditingReference, setIsEditingReference] = useState(false);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Get timezone info
  const timezone = company?.timezone || contact.state 
    ? company?.timezone 
    : null;
  const timezoneInfo = timezone ? {
    display: getTimezoneDisplay(timezone),
    name: getFriendlyTimezoneName(timezone),
    isBusinessHours: isBusinessHours(timezone),
  } : null;

  if (loadingCompany || loadingContext) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timezone / Local Time Card */}
      {timezoneInfo && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{timezoneInfo.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{timezoneInfo.display}</span>
                {timezoneInfo.isBusinessHours ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    Business Hours
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    After Hours
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Opener Context Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Opener Context
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {context?.type === "direct" && context.referrer && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                {context.referrer.first_name} {context.referrer.last_name}
                {context.referrer.title && ` (${context.referrer.title})`} told them to expect your call
              </p>
              {context.note && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Note: {context.note}
                </p>
              )}
              <p className="text-xs text-green-700 dark:text-green-300 mt-2 italic">
                {formatOpenerSuggestion(context)}
              </p>
            </div>
          )}

          {context?.type === "company" && context.companyTalkedTo && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                You spoke with {context.companyTalkedTo.first_name} {context.companyTalkedTo.last_name}
                {context.companyTalkedTo.title && ` (${context.companyTalkedTo.title})`}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-2 italic">
                {formatOpenerSuggestion(context)}
              </p>
            </div>
          )}

          {context?.type === "none" && (
            <>
              {isEditingReference ? (
                <div className="space-y-2">
                  <Label className="text-xs">Add a reference name</Label>
                  <Input
                    value={manualReference}
                    onChange={(e) => setManualReference(e.target.value)}
                    placeholder="e.g., John from IT"
                    className="h-8 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setIsEditingReference(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => {
                        // In a real implementation, this would save to the contact
                        toast.success("Reference saved");
                        setIsEditingReference(false);
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setIsEditingReference(true)}
                >
                  <Edit2 className="h-3 w-3 mr-2" />
                  Add a reference for opener
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Personal Connector / Bio */}
      {contact.direct_referral_note && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Personal Connector
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{contact.direct_referral_note}</p>
          </CardContent>
        </Card>
      )}

      {/* Recent Notes Card */}
      {recentNotes && (recentNotes.pinned.length > 0 || recentNotes.recent.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4" />
              Recent Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Pinned Notes */}
            {recentNotes.pinned.map((note) => (
              <div
                key={note.id}
                className="group flex items-start gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
              >
                <Pin className="h-3 w-3 text-amber-600 shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                  {note.call_timestamp && (
                    <Badge variant="secondary" className="font-mono text-[10px] mb-1">
                      {note.call_timestamp}
                    </Badge>
                  )}
                  <p className="text-xs whitespace-pre-wrap">{note.content}</p>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => {
                          togglePin.mutate({ id: note.id, isPinned: false }, {
                            onSuccess: () => toast.success("Note unpinned"),
                            onError: () => toast.error("Failed to unpin"),
                          });
                        }}
                      >
                        <PinOff className="h-3 w-3 text-amber-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Unpin</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))}
            
            {/* Recent Notes */}
            {recentNotes.recent.slice(0, 5).map((note) => (
              <div
                key={note.id}
                className="group flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                {note.source === "call" ? (
                  <Phone className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
                ) : (
                  <StickyNote className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
                )}
                <div className="flex-1 min-w-0">
                  {note.call_timestamp && (
                    <Badge variant="secondary" className="font-mono text-[10px] mb-1">
                      {note.call_timestamp}
                    </Badge>
                  )}
                  <p className="text-xs whitespace-pre-wrap line-clamp-2">{note.content}</p>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => {
                          togglePin.mutate({ id: note.id, isPinned: true }, {
                            onSuccess: () => toast.success("Note pinned"),
                            onError: () => toast.error("Failed to pin"),
                          });
                        }}
                      >
                        <Pin className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Pin</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))}
            
            {recentNotes.pinned.length === 0 && recentNotes.recent.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                No notes yet for this contact
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Company Info Card */}
      {company && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {company.name}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href={`/companies/${company.id}`}>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>View company</TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {company.industry && (
                <Badge variant="outline">{company.industry}</Badge>
              )}
              {company.employee_range && (
                <span>{company.employee_range} employees</span>
              )}
            </div>
            {/* Company Notes */}
            {companyNotes && companyNotes.length > 0 && (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-1 mb-2">
                  <StickyNote className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Company Notes</span>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {companyNotes.map((note) => (
                    <div key={note.id} className="text-xs p-2 bg-muted/50 rounded group">
                      <div className="flex justify-between items-start gap-1">
                        <p className="whitespace-pre-wrap flex-1">{note.content}</p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -mr-1 -mt-1"
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
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Copy Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Quick Copy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <QuickCopyButton
            label="Full Name"
            value={`${contact.first_name} ${contact.last_name || ""}`.trim()}
            copied={copiedField === "name"}
            onCopy={() => copyToClipboard(`${contact.first_name} ${contact.last_name || ""}`.trim(), "name")}
          />
          {contact.title && (
            <QuickCopyButton
              label="Title"
              value={contact.title}
              copied={copiedField === "title"}
              onCopy={() => copyToClipboard(contact.title!, "title")}
            />
          )}
          {contact.email && (
            <QuickCopyButton
              label="Email"
              value={contact.email}
              copied={copiedField === "email"}
              onCopy={() => copyToClipboard(contact.email!, "email")}
            />
          )}
          {contact.phone && (
            <QuickCopyButton
              label="Phone"
              value={contact.phone}
              copied={copiedField === "phone"}
              onCopy={() => copyToClipboard(contact.phone!, "phone")}
            />
          )}
          {company?.name && (
            <QuickCopyButton
              label="Company"
              value={company.name}
              copied={copiedField === "company"}
              onCopy={() => copyToClipboard(company.name, "company")}
            />
          )}
        </CardContent>
      </Card>

      {/* Other Contacts at Company */}
      {colleagues && colleagues.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Other Contacts at Company
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CompanyContactsMini
              contacts={colleagues as Contact[]}
              currentContactId={contact.id}
              onSelectContact={onSelectContact}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function QuickCopyButton({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-between h-auto py-2 px-3 font-normal"
      onClick={onCopy}
    >
      <span className="flex flex-col items-start">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm truncate max-w-[200px]">{value}</span>
      </span>
      {copied ? (
        <Check className="h-4 w-4 text-green-500 shrink-0" />
      ) : (
        <Copy className="h-4 w-4 text-muted-foreground shrink-0" />
      )}
    </Button>
  );
}

export function ContextPanelSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
