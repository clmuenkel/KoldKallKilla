"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ContactCombobox } from "@/components/ui/contact-combobox";
import { useCreateContact } from "@/hooks/use-contacts";
import { useUpdateMeeting } from "@/hooks/use-meetings";
import { UserPlus, Link2, Loader2, X } from "lucide-react";
import { toast } from "sonner";

/** Strip a trailing " x Evios" (or similar) from a meeting title to guess the company. */
function companyFromTitle(title: string): string {
  return (title || "").replace(/\s*[x×]\s*evios.*$/i, "").trim();
}

/**
 * Shown in the meeting detail when an (imported) meeting has no contact yet —
 * e.g. someone met in person who isn't in the CRM. Lets you create a contact
 * from the calendar event, or link an existing one. Linking is what makes the
 * meeting count toward the show-sequence metrics.
 */
export function LinkContactControl({
  meetingId,
  userId,
  title,
  attendees,
  contacts,
}: {
  meetingId: string;
  userId: string;
  title: string;
  attendees: string[] | null;
  contacts: { id: string; first_name: string; last_name: string | null; company_name: string | null }[] | undefined;
}) {
  const createContact = useCreateContact();
  const updateMeeting = useUpdateMeeting();
  const [mode, setMode] = useState<"idle" | "create" | "link">("idle");

  const guessedCompany = companyFromTitle(title);
  const [firstName, setFirstName] = useState(guessedCompany || title || "");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState((attendees || [])[0] || "");
  const [linkId, setLinkId] = useState<string>("");

  const pending = createContact.isPending || updateMeeting.isPending;

  const handleCreate = async () => {
    if (!firstName.trim()) {
      toast.error("Add a name first");
      return;
    }
    try {
      const c = await createContact.mutateAsync({
        user_id: userId,
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        email: email.trim() || null,
        company_name: guessedCompany || null,
        stage: "meeting",
        source: "calendar",
      } as any);
      await updateMeeting.mutateAsync({ id: meetingId, updates: { contact_id: (c as any).id } });
      toast.success("Contact created and linked");
      setMode("idle");
    } catch (e: any) {
      toast.error(e.message || "Failed to create contact");
    }
  };

  const handleLink = async () => {
    if (!linkId) {
      toast.error("Pick a contact");
      return;
    }
    try {
      await updateMeeting.mutateAsync({ id: meetingId, updates: { contact_id: linkId } });
      toast.success("Contact linked");
      setMode("idle");
    } catch (e: any) {
      toast.error(e.message || "Failed to link contact");
    }
  };

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
          No contact linked — add one so this meeting counts in your show metrics.
        </p>
        {mode !== "idle" && (
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setMode("idle")}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setMode("create")}>
            <UserPlus className="h-4 w-4 mr-2" />
            Create contact
          </Button>
          <Button size="sm" variant="outline" onClick={() => setMode("link")}>
            <Link2 className="h-4 w-4 mr-2" />
            Link existing
          </Button>
        </div>
      )}

      {mode === "create" && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">First name / company</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Last name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-8" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} className="h-8" placeholder="optional" />
          </div>
          <Button size="sm" onClick={handleCreate} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
            Create &amp; link
          </Button>
        </div>
      )}

      {mode === "link" && (
        <div className="space-y-2">
          <ContactCombobox
            contacts={contacts}
            value={linkId}
            onValueChange={setLinkId}
            placeholder="Search your contacts…"
          />
          <Button size="sm" onClick={handleLink} disabled={pending || !linkId}>
            {pending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
            Link contact
          </Button>
        </div>
      )}
    </div>
  );
}
