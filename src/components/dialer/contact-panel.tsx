"use client";

import { useDialerStore } from "@/stores/dialer-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { STAGES, CALL_OUTCOMES, CALL_DISPOSITIONS } from "@/lib/constants";
import { formatPhone, copyToClipboard, getInitials } from "@/lib/utils";
import {
  Phone,
  Mail,
  Building2,
  MapPin,
  Copy,
  ExternalLink,
  Linkedin,
  Users,
  DollarSign,
  Target,
} from "lucide-react";
import { toast } from "sonner";

export function ContactPanel() {
  const {
    currentContact,
    notes,
    outcome,
    disposition,
    confirmedBudget,
    confirmedAuthority,
    confirmedNeed,
    confirmedTimeline,
    setNotes,
    setOutcome,
    setDisposition,
    setQualification,
  } = useDialerStore();

  if (!currentContact) return null;

  const stage = STAGES.find((s) => s.value === currentContact.stage);

  const handleCopy = async (text: string, type: string) => {
    await copyToClipboard(text);
    toast.success(`${type} copied!`);
  };

  const qualificationScore = [confirmedBudget, confirmedAuthority, confirmedNeed, confirmedTimeline]
    .filter(Boolean).length;

  return (
    <div className="h-full flex flex-col p-4 space-y-4 overflow-auto">
      {/* Contact Header */}
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16 ring-2 ring-primary/20">
          <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">
            {getInitials(`${currentContact.first_name} ${currentContact.last_name || ""}`)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold truncate">
            {currentContact.first_name} {currentContact.last_name}
          </h2>
          {currentContact.title && (
            <p className="text-muted-foreground truncate">{currentContact.title}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant={currentContact.stage as any} className="shrink-0">
              {stage?.label || currentContact.stage}
            </Badge>
            {qualificationScore > 0 && (
              <Badge variant="outline" className="shrink-0">
                <Target className="h-3 w-3 mr-1" />
                {qualificationScore}/4 BANT
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Contact Info Grid */}
      <Card className="bg-card/50">
        <CardContent className="p-4 grid gap-3">
          {currentContact.phone && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-sm">{formatPhone(currentContact.phone)}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleCopy(currentContact.phone!, "Phone")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
          
          {currentContact.email && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{currentContact.email}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => handleCopy(currentContact.email!, "Email")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}

          {currentContact.company_name && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{currentContact.company_name}</span>
              {currentContact.employee_range && (
                <Badge variant="outline" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  {currentContact.employee_range}
                </Badge>
              )}
            </div>
          )}

          {currentContact.linkedin_url && (
            <div className="flex items-center gap-2">
              <Linkedin className="h-4 w-4 text-muted-foreground" />
              <a
                href={currentContact.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                LinkedIn <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {(currentContact.city || currentContact.state) && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {[currentContact.city, currentContact.state].filter(Boolean).join(", ")}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* BANT Qualification */}
      <Card className="bg-card/50">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span>Qualification (BANT)</span>
            <span className="text-muted-foreground font-normal">{qualificationScore * 25}%</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={confirmedBudget}
                onCheckedChange={(checked) => setQualification("budget", !!checked)}
              />
              <span className="text-sm">Budget</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={confirmedAuthority}
                onCheckedChange={(checked) => setQualification("authority", !!checked)}
              />
              <span className="text-sm">Authority</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={confirmedNeed}
                onCheckedChange={(checked) => setQualification("need", !!checked)}
              />
              <span className="text-sm">Need</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={confirmedTimeline}
                onCheckedChange={(checked) => setQualification("timeline", !!checked)}
              />
              <span className="text-sm">Timeline</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Call Outcome */}
      <Card className="bg-card/50">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium">Call Outcome</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="grid grid-cols-3 gap-2">
            {CALL_OUTCOMES.map((o) => (
              <Button
                key={o.value}
                variant={outcome === o.value ? "default" : "outline"}
                size="sm"
                onClick={() => setOutcome(o.value as any)}
                className="text-xs h-8"
              >
                <span className="mr-1">{o.icon}</span>
                {o.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Disposition (shown if connected) */}
      {outcome === "connected" && (
        <Card className="bg-card/50">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Disposition</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="grid grid-cols-2 gap-2">
              {CALL_DISPOSITIONS.slice(0, 4).map((d) => (
                <Button
                  key={d.value}
                  variant={disposition === d.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDisposition(d.value as any)}
                  className="text-xs h-8 justify-start"
                >
                  {d.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card className="bg-card/50 flex-1">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium">Call Notes</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <Textarea
            placeholder="Type your notes during the call..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[100px] resize-none bg-background/50"
          />
        </CardContent>
      </Card>
    </div>
  );
}
