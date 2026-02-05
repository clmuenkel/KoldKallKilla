"use client";

import { useState } from "react";
import { useCreateTask } from "@/hooks/use-tasks";
import { useSetReferralFromCall } from "@/hooks/use-referrals";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  Mail,
  Calendar,
  Users,
  Clock,
  Plus,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { addBusinessDays } from "@/lib/utils";
import type { Contact } from "@/types/database";

interface QuickTasksProps {
  contact: Contact;
  colleagues?: Contact[];
  userId: string;
  onTaskCreated?: () => void;
  onReferralSet?: (targetContactId: string) => void;
}

export function QuickTasks({ 
  contact, 
  colleagues = [],
  userId,
  onTaskCreated,
  onReferralSet,
}: QuickTasksProps) {
  const createTask = useCreateTask();
  const setReferral = useSetReferralFromCall();
  
  const [showCustomTask, setShowCustomTask] = useState(false);
  const [showCallColleague, setShowCallColleague] = useState(false);
  const [customTaskTitle, setCustomTaskTitle] = useState("");
  const [customTaskDescription, setCustomTaskDescription] = useState("");
  const [selectedColleague, setSelectedColleague] = useState<string>("");
  const [createdTasks, setCreatedTasks] = useState<Set<string>>(new Set());

  const handleQuickTask = async (
    type: "call" | "email" | "meeting" | "custom",
    daysFromNow?: number
  ) => {
    const taskKey = `${type}-${daysFromNow || "custom"}`;
    if (createdTasks.has(taskKey)) {
      toast.info("Task already created");
      return;
    }

    const dueDate = daysFromNow 
      ? format(addBusinessDays(new Date(), daysFromNow), "yyyy-MM-dd")
      : undefined;

    const taskTitles: Record<string, string> = {
      call: `Follow up call with ${contact.first_name}`,
      email: `Send email to ${contact.first_name}`,
      meeting: `Schedule meeting with ${contact.first_name}`,
    };

    try {
      await createTask.mutateAsync({
        user_id: userId,
        contact_id: contact.id,
        title: taskTitles[type] || customTaskTitle,
        description: customTaskDescription || undefined,
        type,
        priority: "medium",
        status: "pending",
        due_date: dueDate,
      });

      setCreatedTasks(prev => new Set(prev).add(taskKey));
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} task created!`);
      onTaskCreated?.();
      
      if (type === "custom") {
        setShowCustomTask(false);
        setCustomTaskTitle("");
        setCustomTaskDescription("");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create task");
    }
  };

  const handleCallColleague = async () => {
    if (!selectedColleague) {
      toast.error("Please select a colleague");
      return;
    }

    try {
      // Set referral - the colleague will know this person referred them
      await setReferral.mutateAsync({
        targetContactId: selectedColleague,
        calledContactId: contact.id,
        companyId: contact.company_id || undefined,
        note: `${contact.first_name} directed call`,
      });

      // Create task to call the colleague
      await createTask.mutateAsync({
        user_id: userId,
        contact_id: selectedColleague,
        title: `Call referred by ${contact.first_name}`,
        description: `${contact.first_name} ${contact.last_name || ""} suggested calling this person`,
        type: "call",
        priority: "high",
        status: "pending",
      });

      toast.success("Referral set and task created!");
      setShowCallColleague(false);
      setSelectedColleague("");
      onReferralSet?.(selectedColleague);
    } catch (error: any) {
      toast.error(error.message || "Failed to set referral");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Quick Tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Follow up call buttons */}
        <div className="grid grid-cols-3 gap-2">
          <QuickTaskButton
            icon={Phone}
            label="Call in 1 day"
            onClick={() => handleQuickTask("call", 1)}
            created={createdTasks.has("call-1")}
            isPending={createTask.isPending}
          />
          <QuickTaskButton
            icon={Phone}
            label="Call in 3 days"
            onClick={() => handleQuickTask("call", 3)}
            created={createdTasks.has("call-3")}
            isPending={createTask.isPending}
          />
          <QuickTaskButton
            icon={Phone}
            label="Call in 1 week"
            onClick={() => handleQuickTask("call", 7)}
            created={createdTasks.has("call-7")}
            isPending={createTask.isPending}
          />
        </div>

        {/* Other quick actions */}
        <div className="grid grid-cols-2 gap-2">
          <QuickTaskButton
            icon={Mail}
            label="Send email"
            onClick={() => handleQuickTask("email", 0)}
            created={createdTasks.has("email-0")}
            isPending={createTask.isPending}
          />
          <QuickTaskButton
            icon={Calendar}
            label="Schedule meeting"
            onClick={() => handleQuickTask("meeting", 1)}
            created={createdTasks.has("meeting-1")}
            isPending={createTask.isPending}
          />
        </div>

        {/* Call colleague - only show if there are colleagues */}
        {colleagues.length > 0 && (
          <Dialog open={showCallColleague} onOpenChange={setShowCallColleague}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Users className="h-4 w-4" />
                Call colleague (set referral)
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Call a Colleague</DialogTitle>
                <DialogDescription>
                  Select who to call next. They'll have context that {contact.first_name} referred you.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Colleague</Label>
                  <Select value={selectedColleague} onValueChange={setSelectedColleague}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a colleague..." />
                    </SelectTrigger>
                    <SelectContent>
                      {colleagues.map((colleague) => (
                        <SelectItem key={colleague.id} value={colleague.id}>
                          {colleague.first_name} {colleague.last_name}
                          {colleague.title && ` - ${colleague.title}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCallColleague(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCallColleague}
                  disabled={!selectedColleague || setReferral.isPending}
                >
                  {setReferral.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Set Referral & Create Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Custom task */}
        <Dialog open={showCustomTask} onOpenChange={setShowCustomTask}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Custom task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Custom Task</DialogTitle>
              <DialogDescription>
                Create a custom follow-up task for {contact.first_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Task Title</Label>
                <Input
                  value={customTaskTitle}
                  onChange={(e) => setCustomTaskTitle(e.target.value)}
                  placeholder="Enter task title..."
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  value={customTaskDescription}
                  onChange={(e) => setCustomTaskDescription(e.target.value)}
                  placeholder="Add details..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCustomTask(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => handleQuickTask("custom")}
                disabled={!customTaskTitle || createTask.isPending}
              >
                {createTask.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Create Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function QuickTaskButton({
  icon: Icon,
  label,
  onClick,
  created,
  isPending,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  created: boolean;
  isPending: boolean;
}) {
  if (created) {
    return (
      <Button variant="ghost" size="sm" className="gap-1 h-auto py-2" disabled>
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <span className="text-xs">Created</span>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={isPending}
      className="gap-1 h-auto py-2"
    >
      <Icon className="h-4 w-4" />
      <span className="text-xs">{label}</span>
    </Button>
  );
}
