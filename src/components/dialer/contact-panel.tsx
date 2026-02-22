"use client";

import { useDialerStore } from "@/stores/dialer-store";
import { useCompany } from "@/hooks/use-companies";
import { useUpdateContact } from "@/hooks/use-contacts";
import { useNextCompanyMeeting } from "@/hooks/use-meetings";
import { useContactContext, formatOpenerSuggestion, useUpdateReferralNote, useSetCustomOpener, useRemoveDirectReferral, useBulkSetOpenerForCompany } from "@/hooks/use-referrals";
import { useCompanyNotes } from "@/hooks/use-notes";
import { Badge, StageBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { STAGES, CALL_OUTCOMES_UI, CALL_DISPOSITIONS, PICKUP_DISPOSITIONS } from "@/lib/constants";
import { formatPhone, copyToClipboard, getInitials, cn } from "@/lib/utils";
import { getTimezoneFromLocation, getLocalTime, getTimezoneAbbreviation, isBusinessHours } from "@/lib/timezone";
import {
  Phone,
  Mail,
  Building2,
  MapPin,
  Copy,
  ExternalLink,
  Linkedin,
  Users,
  Clock,
  MessageSquare,
  Check,
  Edit2,
  StickyNote,
  Smartphone,
  Globe,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Calendar,
  Repeat,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import Link from "next/link";

export function ContactPanelCompact() {
  const {
    currentContact,
    outcome,
    disposition,
    setOutcome,
    setDisposition,
    updateCurrentContact,
  } = useDialerStore();

  const { data: company } = useCompany(currentContact?.company_id || "");
  const { data: context } = useContactContext(
    currentContact?.id || "",
    currentContact?.company_id
  );
  const { data: companyNotes } = useCompanyNotes(currentContact?.company_id);
  const { data: nextMeeting } = useNextCompanyMeeting(currentContact?.company_id ?? undefined);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isEditingOpener, setIsEditingOpener] = useState(false);
  const [openerText, setOpenerText] = useState("");
  const [companyExpanded, setCompanyExpanded] = useState(true);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const updateReferralNote = useUpdateReferralNote();
  const setCustomOpener = useSetCustomOpener();
  const removeReferral = useRemoveDirectReferral();
  const bulkSetOpenerForCompany = useBulkSetOpenerForCompany();
  const updateContact = useUpdateContact();

  if (!currentContact) return null;

  // Reset edit state when switching to a different contact
  useEffect(() => {
    setIsEditingContact(false);
  }, [currentContact.id]);

  const stage = STAGES.find((s) => s.value === currentContact.stage);

  // Get timezone info
  const timezone = company?.timezone || getTimezoneFromLocation(
    currentContact.city,
    currentContact.state,
    currentContact.country
  );
  const localTime = getLocalTime(timezone);
  const tzAbbr = getTimezoneAbbreviation(timezone);
  const isBusiness = isBusinessHours(timezone);

  const handleCopy = async (text: string, field: string) => {
    await copyToClipboard(text);
    setCopiedField(field);
    toast.success("Copied!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Quick copy button with animated feedback
  const CopyButton = ({ text, field, className }: { text: string; field: string; className?: string }) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleCopy(text, field);
      }}
      className={cn(
        "p-1.5 rounded-md transition-all duration-200",
        "hover:bg-primary/10 active:scale-95",
        copiedField === field 
          ? "bg-emerald-500/10 text-emerald-600" 
          : "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {copiedField === field ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );

  // Get full name with title for opener context
  const getOpenerName = () => {
    if (context?.type === "direct" && context.referrer) {
      const name = `${context.referrer.first_name} ${context.referrer.last_name || ""}`.trim();
      return context.referrer.title ? `${name} (${context.referrer.title})` : name;
    }
    if (context?.type === "company" && context.companyTalkedTo) {
      const name = `${context.companyTalkedTo.first_name} ${context.companyTalkedTo.last_name || ""}`.trim();
      return context.companyTalkedTo.title ? `${name} (${context.companyTalkedTo.title})` : name;
    }
    return null;
  };

  const contactFullName = `${currentContact.first_name} ${currentContact.last_name || ""}`.trim();

  return (
    <div className="space-y-4">
      {/* Hero Section */}
      <div className="relative rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 dark:from-primary/10 dark:via-primary/5 dark:to-transparent p-5">
        <div className="flex items-start gap-4">
          {/* Large Avatar */}
          <Avatar className="h-16 w-16 ring-4 ring-background shadow-lg">
            <AvatarFallback className="text-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold">
              {getInitials(contactFullName)}
            </AvatarFallback>
          </Avatar>

          {/* Name & Title */}
          <div className="flex-1 min-w-0">
            {isEditingContact ? (
              <div className="space-y-2">
                <Label className="text-[10px] uppercase text-muted-foreground">First name</Label>
                <Input
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="h-9 text-sm"
                  placeholder="First name"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold tracking-tight truncate">
                  {contactFullName}
                </h2>
                <CopyButton text={contactFullName} field="name" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-muted-foreground"
                  onClick={() => {
                    setEditFirstName(currentContact.first_name || "");
                    setEditMobile(currentContact.mobile || "");
                    setEditPhone(currentContact.phone || "");
                    setEditEmail(currentContact.email || "");
                    setIsEditingContact(true);
                  }}
                >
                  <Edit2 className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
              </div>
            )}
            {!isEditingContact && currentContact.title && (
              <p className="text-muted-foreground font-medium mt-0.5 flex items-center gap-2">
                <Briefcase className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{currentContact.title}</span>
              </p>
            )}
            
            {/* Badges Row */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <StageBadge 
                stage={currentContact.stage as "fresh" | "contacted" | "qualified" | "meeting" | "proposal" | "won" | "lost"} 
                className="shadow-sm"
              />
              {/* Timezone Badge */}
              <Badge 
                variant="outline" 
                className={cn(
                  "gap-1.5",
                  isBusiness 
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" 
                    : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                )}
              >
                <Clock className="h-3 w-3" />
                <span className="font-mono">{localTime}</span>
                <span className="text-[10px] opacity-70">{tzAbbr}</span>
              </Badge>
            </div>
            {nextMeeting && (
              <Link
                href="/meetings"
                className="flex items-center gap-2 mt-2 text-sm text-primary hover:underline"
              >
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {nextMeeting.contacts
                    ? `Meeting with ${nextMeeting.contacts.first_name} ${nextMeeting.contacts.last_name ?? ""}`.trim()
                    : "Upcoming"}
                  {" "}on {format(new Date(nextMeeting.scheduled_at), "MMM d")} at{" "}
                  {format(new Date(nextMeeting.scheduled_at), "h:mm a")}
                  {nextMeeting.title && ` · ${nextMeeting.title}`}
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Bar - 2 Column Grid (or edit form) */}
      {isEditingContact ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-muted-foreground">Mobile</Label>
              <Input
                value={editMobile}
                onChange={(e) => setEditMobile(e.target.value)}
                className="h-9 font-mono text-sm"
                placeholder="Mobile number"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-muted-foreground">Direct</Label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="h-9 font-mono text-sm"
                placeholder="Direct number"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-muted-foreground">Email</Label>
            <Input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="h-9 text-sm"
              placeholder="Email"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingContact(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={updateContact.isPending}
              onClick={async () => {
                const updates = {
                  first_name: editFirstName.trim() || null,
                  mobile: editMobile.trim() || null,
                  phone: editPhone.trim() || null,
                  email: editEmail.trim() || null,
                };
                try {
                  await updateContact.mutateAsync({
                    id: currentContact.id,
                    updates,
                  });
                  updateCurrentContact(updates);
                  toast.success("Contact updated");
                  setIsEditingContact(false);
                } catch (error: any) {
                  toast.error(error.message || "Failed to update contact");
                }
              }}
            >
              {updateContact.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {/* Mobile */}
          {currentContact.mobile && (
            <button
              onClick={() => handleCopy(currentContact.mobile!, "mobile")}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
                "hover:bg-muted/50 hover:border-primary/30 hover:shadow-sm",
                "active:scale-[0.98]",
                copiedField === "mobile" && "bg-emerald-500/10 border-emerald-500/30"
              )}
            >
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                "bg-blue-500/10 text-blue-600 dark:text-blue-400"
              )}>
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Mobile</p>
                <p className="font-mono font-semibold truncate">{formatPhone(currentContact.mobile)}</p>
              </div>
              {copiedField === "mobile" && <Check className="h-4 w-4 text-emerald-500 ml-auto shrink-0" />}
            </button>
          )}

          {/* Direct Phone */}
          {currentContact.phone && (
            <button
              onClick={() => handleCopy(currentContact.phone!, "phone")}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
                "hover:bg-muted/50 hover:border-primary/30 hover:shadow-sm",
                "active:scale-[0.98]",
                copiedField === "phone" && "bg-emerald-500/10 border-emerald-500/30"
              )}
            >
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              )}>
                <Phone className="h-5 w-5" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Direct</p>
                <p className="font-mono font-semibold truncate">{formatPhone(currentContact.phone)}</p>
              </div>
              {copiedField === "phone" && <Check className="h-4 w-4 text-emerald-500 ml-auto shrink-0" />}
            </button>
          )}

          {/* Email */}
          {currentContact.email && (
            <button
              onClick={() => handleCopy(currentContact.email!, "email")}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
                "hover:bg-muted/50 hover:border-primary/30 hover:shadow-sm",
                "active:scale-[0.98]",
                copiedField === "email" && "bg-emerald-500/10 border-emerald-500/30"
              )}
            >
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                "bg-purple-500/10 text-purple-600 dark:text-purple-400"
              )}>
                <Mail className="h-5 w-5" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Email</p>
                <p className="font-semibold truncate">{currentContact.email}</p>
              </div>
              {copiedField === "email" && <Check className="h-4 w-4 text-emerald-500 ml-auto shrink-0" />}
            </button>
          )}

          {/* LinkedIn */}
          {currentContact.linkedin_url && (
          <a
            href={currentContact.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
              "hover:bg-blue-500/5 hover:border-blue-500/30 hover:shadow-sm",
              "active:scale-[0.98]"
            )}
          >
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
              "bg-blue-600/10 text-blue-600 dark:text-blue-400"
            )}>
              <Linkedin className="h-5 w-5" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">LinkedIn</p>
              <p className="font-semibold text-blue-600 dark:text-blue-400">View Profile</p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
          </a>
          )}
        </div>
      )}

      {/* Location Row */}
      {(currentContact.city || currentContact.state) && (
        <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span>{[currentContact.city, currentContact.state, currentContact.country].filter(Boolean).join(", ")}</span>
        </div>
      )}

      {/* Cadence - editable in dialer */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Next call
          </label>
          <input
            type="date"
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
            value={(currentContact as { next_call_date?: string | null }).next_call_date ?? ""}
            onChange={(e) => {
              const value = e.target.value || null;
              updateContact.mutate(
                { id: currentContact.id, updates: { next_call_date: value } },
                { onSuccess: () => toast.success("Next call date updated"), onError: () => toast.error("Failed to update") }
              );
            }}
            disabled={updateContact.isPending}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Repeat className="h-3 w-3" /> Every
          </label>
          <Select
            value={(currentContact as { cadence_days?: number | null }).cadence_days?.toString() ?? "default"}
            onValueChange={(value) => {
              updateContact.mutate(
                {
                  id: currentContact.id,
                  updates: { cadence_days: value === "default" ? null : parseInt(value, 10) },
                },
                { onSuccess: () => toast.success("Cadence updated"), onError: () => toast.error("Failed to update") }
              );
            }}
            disabled={updateContact.isPending}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="2">2 days</SelectItem>
              <SelectItem value="3">3 days</SelectItem>
              <SelectItem value="5">5 days</SelectItem>
              <SelectItem value="7">1 week</SelectItem>
              <SelectItem value="14">2 weeks</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Company Card - Collapsible */}
      {(company || currentContact.company_name) && (
        <Card className="overflow-hidden">
          <button
            onClick={() => setCompanyExpanded(!companyExpanded)}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-slate-500/10 to-slate-600/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold">{company?.name || currentContact.company_name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {(company?.industry || currentContact.industry) && (
                    <span>{company?.industry || currentContact.industry}</span>
                  )}
                  {(company?.employee_range || currentContact.employee_range) && (
                    <>
                      <span className="text-border">•</span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {company?.employee_range || currentContact.employee_range}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            {companyExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          
          {companyExpanded && (
            <CardContent className="pt-0 pb-4 px-4 border-t">
              {/* Company-Wide Notes */}
              {companyNotes && companyNotes.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <StickyNote className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      Company Notes ({companyNotes.length})
                    </span>
                  </div>
                  <div className="space-y-2 max-h-28 overflow-y-auto">
                    {companyNotes.slice(0, 3).map((note) => (
                      <div 
                        key={note.id} 
                        className="text-xs p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-2 border-blue-400"
                      >
                        <p className="text-blue-800 dark:text-blue-200">{note.content}</p>
                        <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-1">
                          {new Date(note.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!companyNotes || companyNotes.length === 0) && (
                <p className="text-xs text-muted-foreground italic mt-2">
                  No company notes yet
                </p>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Opener Context */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="h-4 w-4 text-primary" />
              Opener Context
            </div>
            {(context?.type === "direct" || context?.type === "company" || currentContact.direct_referral_note) && !isEditingOpener && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setOpenerText(context?.note || currentContact.direct_referral_note || "");
                  setIsEditingOpener(true);
                }}
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
          </div>
          
          {isEditingOpener ? (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">What you'll say:</Label>
                <Textarea
                  value={openerText}
                  onChange={(e) => setOpenerText(e.target.value)}
                  placeholder="e.g., John Smith told me to reach out..."
                  className="mt-1.5"
                  rows={3}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setIsEditingOpener(false)}
                >
                  Cancel
                </Button>
                {(context?.type === "direct" || currentContact.direct_referral_note) && (
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={async () => {
                      try {
                        await removeReferral.mutateAsync(currentContact.id);
                        updateCurrentContact({ direct_referral_note: null });
                        toast.success("Opener cleared");
                        setIsEditingOpener(false);
                        setOpenerText("");
                      } catch (error: any) {
                        toast.error(error.message || "Failed to clear opener");
                      }
                    }}
                    disabled={removeReferral.isPending}
                  >
                    Clear
                  </Button>
                )}
                <Button 
                  size="sm" 
                  onClick={async () => {
                    try {
                      if (context?.type === "direct") {
                        await updateReferralNote.mutateAsync({
                          contactId: currentContact.id,
                          note: openerText,
                        });
                      } else {
                        await setCustomOpener.mutateAsync({
                          contactId: currentContact.id,
                          openerText: openerText,
                        });
                      }
                      updateCurrentContact({ direct_referral_note: openerText.trim() || null });
                      toast.success("Opener saved");
                      setIsEditingOpener(false);
                    } catch (error: any) {
                      toast.error(error.message || "Failed to save opener");
                    }
                  }}
                  disabled={updateReferralNote.isPending || setCustomOpener.isPending}
                >
                  Add for this person
                </Button>
                {currentContact.company_id && (
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await bulkSetOpenerForCompany.mutateAsync({
                          companyId: currentContact.company_id!,
                          openerText: openerText,
                        });
                        updateCurrentContact({ direct_referral_note: openerText.trim() || null });
                        toast.success("Opener set for everyone at this company");
                        setIsEditingOpener(false);
                      } catch (error: any) {
                        toast.error(error.message || "Failed to set opener for company");
                      }
                    }}
                    disabled={bulkSetOpenerForCompany.isPending}
                  >
                    Add for everyone in company
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              {context?.type === "direct" && context.referrer && (
                <div className="p-3 rounded-lg bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
                  <p className="font-medium text-emerald-800 dark:text-emerald-300">
                    {getOpenerName()} told them to expect your call
                  </p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-2 italic">
                    "{context.note || formatOpenerSuggestion(context)}"
                  </p>
                </div>
              )}

              {context?.type === "company" && context.companyTalkedTo && (
                <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                  <p className="font-medium text-blue-800 dark:text-blue-300">
                    You spoke with {getOpenerName()}
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-2 italic">
                    "{formatOpenerSuggestion(context)}"
                  </p>
                </div>
              )}

              {context?.type === "none" && !currentContact.direct_referral_note && (
                <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() => {
                    setOpenerText("");
                    setIsEditingOpener(true);
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Add opener context
                </Button>
              )}

              {context?.type === "none" && currentContact.direct_referral_note && (
                <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-purple-500/5 border border-purple-500/20">
                  <p className="font-medium text-purple-800 dark:text-purple-300">
                    Custom Opener
                  </p>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mt-2 italic">
                    "{currentContact.direct_referral_note}"
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Call Outcome */}
      <Card>
        <CardContent className="p-4">
          <div className="text-sm font-semibold mb-3">Call Outcome</div>
          <div className="grid grid-cols-3 gap-2">
            {CALL_OUTCOMES_UI.map((o) => (
              <Button
                key={o.value}
                variant={outcome === o.value ? "default" : "outline"}
                size="sm"
                onClick={() => setOutcome(o.value as any)}
                className={cn(
                  "h-10 transition-all",
                  outcome === o.value && "shadow-md"
                )}
              >
                <span className="mr-1.5 text-base">{o.icon}</span>
                {o.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pickup Disposition (shown if connected) */}
      {outcome === "connected" && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4">
            <div className="text-sm font-semibold mb-3 text-emerald-800 dark:text-emerald-300">What happened?</div>
            <div className="grid grid-cols-2 gap-2">
              {PICKUP_DISPOSITIONS.map((d) => (
                <Button
                  key={d.value}
                  variant={disposition === d.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDisposition(d.value as any)}
                  className={cn(
                    "h-10 justify-start transition-all text-xs",
                    disposition === d.value && "shadow-md bg-emerald-500 hover:bg-emerald-600"
                  )}
                >
                  {d.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Keep old export for backwards compatibility
export { ContactPanelCompact as ContactPanel };
