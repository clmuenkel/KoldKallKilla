"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { format, addDays } from "date-fns";
import { useCreateTask } from "@/hooks/use-tasks";
import { addBusinessDays } from "@/lib/utils";
import { toast } from "sonner";

// Helper to determine if task type uses calendar days (any day) vs business days
const isCalendarDayType = (type: string): boolean => 
  type === "custom" || type === "other";

interface TaskPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskContent: string;
  contactId: string;
  contactName: string;
  contactTitle?: string;
  contactCompany?: string;
  userId: string;
  onTaskCreated?: () => void;
}

const TASK_TYPES = [
  { value: "call", label: "📞 Call" },
  { value: "email", label: "📧 Email" },
  { value: "follow_up", label: "🔄 Follow-up" },
  { value: "meeting", label: "📅 Meeting" },
  { value: "other", label: "📝 Other" },
];

const IMPORTANCE_OPTIONS = Array.from({ length: 10 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}${i === 0 ? " (Low)" : i === 9 ? " (Critical)" : ""}`,
}));

// Quick dates using business days (skips weekends) - for call, email, follow_up, meeting
const QUICK_DATES_BUSINESS = [
  { label: "Today", days: 0 },
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "In 1 week", days: 5 },
  { label: "In 2 weeks", days: 10 },
  { label: "In 1 month", days: 22 },
];

// Quick dates using calendar days (any day) - for custom, other
const QUICK_DATES_CALENDAR = [
  { label: "Today", days: 0 },
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "In 1 week", days: 7 },
  { label: "In 2 weeks", days: 14 },
  { label: "In 1 month", days: 30 },
];

export function TaskPopup({
  open,
  onOpenChange,
  taskContent,
  contactId,
  contactName,
  contactTitle,
  contactCompany,
  userId,
  onTaskCreated,
}: TaskPopupProps) {
  const [title, setTitle] = useState(taskContent);
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState("follow_up");
  const [importance, setImportance] = useState("5");
  const [dueDate, setDueDate] = useState<string>(format(addBusinessDays(new Date(), 1), "yyyy-MM-dd"));
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiSuggested, setAiSuggested] = useState(false);
  
  const lastContentRef = useRef<string>("");
  const createTask = useCreateTask();

  // Fetch AI suggestions when popup opens with new content
  useEffect(() => {
    if (!open || !taskContent || taskContent === lastContentRef.current) return;
    
    lastContentRef.current = taskContent;
    setIsLoadingAI(true);
    setAiSuggested(false);

    fetch("/api/ai/task-suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: taskContent,
        contact: {
          name: contactName,
          title: contactTitle,
          company: contactCompany,
        },
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.title) setTitle(data.title);
        if (data.type) setTaskType(data.type);
        if (data.importance) setImportance(String(data.importance));
        setAiSuggested(true);
      })
      .catch((err) => {
        console.error("AI suggestion failed:", err);
        // Fallback to raw content
        setTitle(taskContent);
      })
      .finally(() => {
        setIsLoadingAI(false);
      });
  }, [open, taskContent, contactName, contactTitle, contactCompany]);

  // Helper to compute due date based on task type
  const getDateForQuickOption = (days: number, type: string): Date => {
    if (days === 0) return new Date();
    return isCalendarDayType(type) 
      ? addDays(new Date(), days) 
      : addBusinessDays(new Date(), days);
  };

  const handleQuickDate = (days: number) => {
    const date = getDateForQuickOption(days, taskType);
    setDueDate(format(date, "yyyy-MM-dd"));
  };

  // Get the appropriate quick dates based on current task type
  const quickDates = isCalendarDayType(taskType) ? QUICK_DATES_CALENDAR : QUICK_DATES_BUSINESS;

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Task title is required");
      return;
    }

    if (!dueDate) {
      toast.error("Due date is required");
      return;
    }

    try {
      await createTask.mutateAsync({
        user_id: userId,
        contact_id: contactId,
        title: title.trim(),
        description: description.trim() || undefined,
        type: taskType,
        importance: parseInt(importance),
        due_date: dueDate,
        priority: parseInt(importance) >= 8 ? "high" : parseInt(importance) >= 5 ? "medium" : "low",
        status: "todo",
      });

      toast.success("Task created!", {
        description: `${title} - Due ${format(new Date(dueDate), "MMM d")}`,
      });

      onTaskCreated?.();
      onOpenChange(false);

      // Reset form
      setTitle("");
      setDescription("");
      setTaskType("follow_up");
      setImportance("5");
      setDueDate(format(addBusinessDays(new Date(), 1), "yyyy-MM-dd"));
    } catch (error: any) {
      toast.error(error.message || "Failed to create task");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Create Task</DialogTitle>
            {isLoadingAI && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Sparkles className="h-3 w-3 animate-pulse" />
                AI suggesting...
              </Badge>
            )}
            {aiSuggested && !isLoadingAI && (
              <Badge variant="outline" className="text-[10px] gap-1 text-green-600 border-green-300">
                <Sparkles className="h-3 w-3" />
                AI suggested
              </Badge>
            )}
          </div>
          <DialogDescription>
            Task for {contactName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details..."
              rows={2}
            />
          </div>

          {/* Task Type */}
          <div className="space-y-2">
            <Label>Task Type</Label>
            <Select value={taskType} onValueChange={setTaskType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Importance */}
          <div className="space-y-2">
            <Label>Importance (1-10)</Label>
            <Select value={importance} onValueChange={setImportance}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMPORTANCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <div className="flex flex-wrap gap-1 mb-2">
              {quickDates.map((qd) => (
                <Button
                  key={qd.label}
                  type="button"
                  variant={
                    dueDate === format(getDateForQuickOption(qd.days, taskType), "yyyy-MM-dd")
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => handleQuickDate(qd.days)}
                >
                  {qd.label}
                </Button>
              ))}
            </div>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={format(new Date(), "yyyy-MM-dd")}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createTask.isPending}>
            {createTask.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
