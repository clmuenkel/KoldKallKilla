"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateTask } from "@/hooks/use-tasks";
import { useContacts } from "@/hooks/use-contacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ContactCombobox } from "@/components/ui/contact-combobox";
import { ContactMultiSelect } from "@/components/ui/contact-multi-select";
import { TASK_TYPES, TASK_PRIORITIES } from "@/lib/constants";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthId } from "@/hooks/use-auth";
import { useEffect, useState } from "react";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.string().default("follow_up"),
  priority: z.string().default("medium"),
  due_date: z.string().optional(),
  contact_id: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultContactId?: string;
}

export function TaskForm({ open, onOpenChange, defaultContactId }: TaskFormProps) {
  const userId = useAuthId()!;
  const [additionalContactIds, setAdditionalContactIds] = useState<string[]>([]);
  const supabase = createClient();
  const createTask = useCreateTask();
  const { data: contacts } = useContacts();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "follow_up",
      priority: "medium",
      due_date: "",
      contact_id: defaultContactId || "",
    },
  });

  // When dialog opens from contact page, sync contact_id and reset additional contacts
  useEffect(() => {
    if (open) {
      setValue("contact_id", defaultContactId || "");
      setAdditionalContactIds([]);
    }
  }, [open, defaultContactId, setValue]);

  const onSubmit = async (data: TaskFormValues) => {
    if (!userId) {
      toast.error("Not authenticated");
      return;
    }

    try {
      await createTask.mutateAsync({
        ...data,
        user_id: userId,
        due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
        contact_id: data.contact_id || null,
        additional_contact_ids: additionalContactIds.length > 0 ? additionalContactIds : undefined,
      });
      toast.success("Task created!");
      setAdditionalContactIds([]);
      reset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create task");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Follow up with John"
              {...register("title")}
              className={errors.title ? "border-destructive" : ""}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add more details..."
              {...register("description")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={watch("type")}
                onValueChange={(v) => setValue("type", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={watch("priority")}
                onValueChange={(v) => setValue("priority", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date</Label>
            <Input id="due_date" type="datetime-local" {...register("due_date")} />
          </div>

          <div className="space-y-2">
            <Label>Related Contact</Label>
            <ContactCombobox
              contacts={contacts}
              value={watch("contact_id")}
              onValueChange={(v) => setValue("contact_id", v)}
              placeholder="Search contacts (optional)"
            />
          </div>

          <div className="space-y-2">
            <Label>Also for (optional)</Label>
            <ContactMultiSelect
              contacts={contacts}
              value={additionalContactIds}
              onValueChange={setAdditionalContactIds}
              placeholder="Add other contacts..."
              excludeIds={watch("contact_id") ? [watch("contact_id")] : []}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
