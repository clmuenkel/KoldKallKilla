"use client";

import { useContacts, useUpdateContact } from "@/hooks/use-contacts";
import { STAGES } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, StageBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getInitials, cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Phone, Mail, Clock, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Contact } from "@/types/database";

export function PipelineBoard() {
  const { data: contacts, isLoading } = useContacts();
  const updateContact = useUpdateContact();

  const handleDragStart = (e: React.DragEvent, contactId: string) => {
    e.dataTransfer.setData("contactId", contactId);
  };

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    const contactId = e.dataTransfer.getData("contactId");
    
    try {
      await updateContact.mutateAsync({
        id: contactId,
        updates: { stage: newStage },
      });
      toast.success("Contact moved!");
    } catch (error) {
      toast.error("Failed to move contact");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 h-full p-4">
        {STAGES.map((stage) => (
          <div key={stage.value} className="w-72 flex-shrink-0">
            <Skeleton className="h-full" />
          </div>
        ))}
      </div>
    );
  }

  // Group contacts by stage
  const contactsByStage = STAGES.reduce((acc, stage) => {
    acc[stage.value] = contacts?.filter((c) => c.stage === stage.value) || [];
    return acc;
  }, {} as Record<string, Contact[]>);

  return (
    <div className="flex gap-4 h-full overflow-x-auto p-4">
      {STAGES.map((stage) => (
        <div
          key={stage.value}
          className="w-72 flex-shrink-0 flex flex-col bg-muted/30 rounded-lg"
          onDrop={(e) => handleDrop(e, stage.value)}
          onDragOver={handleDragOver}
        >
          {/* Column Header */}
          <div className="p-3 border-b bg-card rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn("h-3 w-3 rounded-full", stage.color)} />
                <h3 className="font-semibold">{stage.label}</h3>
              </div>
              <Badge variant="secondary">{contactsByStage[stage.value].length}</Badge>
            </div>
          </div>

          {/* Cards */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {contactsByStage[stage.value].length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No contacts
                </div>
              ) : (
                contactsByStage[stage.value].map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    onDragStart={(e) => handleDragStart(e, contact.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}

function ContactCard({
  contact,
  onDragStart,
}: {
  contact: Contact;
  onDragStart: (e: React.DragEvent) => void;
}) {
  const router = useRouter();
  const bantScore = [contact.has_budget, contact.is_authority, contact.has_need, contact.has_timeline].filter(Boolean).length;
  
  const handleCall = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/dialer?contact=${contact.id}`);
  };

  const handleEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (contact.email) {
      window.open(`mailto:${contact.email}`, "_blank");
    }
  };

  return (
    <Link href={`/contacts/${contact.id}`}>
      <Card
        className="cursor-grab active:cursor-grabbing hover:shadow-md transition-all group relative"
        draggable
        onDragStart={onDragStart}
      >
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                {getInitials(`${contact.first_name} ${contact.last_name || ""}`)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {contact.first_name} {contact.last_name}
              </p>
              {contact.title && (
                <p className="text-xs text-muted-foreground truncate">
                  {contact.title}
                </p>
              )}
              {contact.company_name && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  <span className="truncate">{contact.company_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Last Contacted & BANT Score */}
          <div className="flex items-center justify-between mt-2 text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {contact.last_contacted_at 
                  ? formatDistanceToNow(new Date(contact.last_contacted_at), { addSuffix: true })
                  : "Never contacted"}
              </span>
            </div>
            {bantScore > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-0.5">
                    {[...Array(4)].map((_, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          i < bantScore ? "bg-emerald-500" : "bg-muted"
                        )} 
                      />
                    ))}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  BANT Score: {bantScore}/4
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Quick Actions - Show on Hover */}
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {contact.phone && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="secondary" 
                    className="h-7 w-7 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600"
                    onClick={handleCall}
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Call</TooltipContent>
              </Tooltip>
            )}
            {contact.email && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="secondary" 
                    className="h-7 w-7 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600"
                    onClick={handleEmail}
                  >
                    <Mail className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Email</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Quick Info Tags */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {contact.industry && (
              <Badge variant="outline" className="text-[10px] h-5">
                {contact.industry}
              </Badge>
            )}
            {contact.total_calls > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5">
                {contact.total_calls} call{contact.total_calls !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
