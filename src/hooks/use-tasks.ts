"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Task, TaskWithContact, InsertTables, UpdateTables } from "@/types/database";

export function useTasks(filters?: {
  status?: string;
  contactId?: string;
  dueToday?: boolean;
  limit?: number;
}) {
  const supabase = createClient();

  return useQuery<TaskWithContact[]>({
    queryKey: ["tasks", filters],
    queryFn: async () => {
      const selectWithJunction =
        "*, contacts(id, first_name, last_name, company_name), task_contacts(contact_id, contacts(id, first_name, last_name, company_name))";

      let query = supabase
        .from("tasks")
        .select(selectWithJunction)
        .order("due_date", { ascending: true, nullsFirst: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters?.contactId) {
        const contactId = filters.contactId;
        const { data: junctionRows } = await supabase
          .from("task_contacts")
          .select("task_id")
          .eq("contact_id", contactId);
        const taskIdsFromJunction = (junctionRows ?? []).map((r) => r.task_id);
        if (taskIdsFromJunction.length > 0) {
          query = query.or(
            `contact_id.eq.${contactId},id.in.(${taskIdsFromJunction.join(",")})`
          );
        } else {
          query = query.eq("contact_id", contactId);
        }
      }

      if (filters?.dueToday) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        query = query
          .gte("due_date", today.toISOString())
          .lt("due_date", tomorrow.toISOString());
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as TaskWithContact[];
    },
  });
}

export function useTodayTasks() {
  const supabase = createClient();

  return useQuery<TaskWithContact[]>({
    queryKey: ["tasks", "today"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("tasks")
        .select(
          "*, contacts(id, first_name, last_name, company_name), task_contacts(contact_id, contacts(id, first_name, last_name, company_name))"
        )
        .eq("status", "todo")
        .lte("due_date", today.toISOString())
        .order("due_date", { ascending: true })
        .limit(10);

      if (error) throw error;
      return data as unknown as TaskWithContact[];
    },
  });
}

export function useCreateTask() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: InsertTables<"tasks"> & { additional_contact_ids?: string[] }
    ) => {
      const { additional_contact_ids, ...task } = payload;
      const { data, error } = await supabase
        .from("tasks")
        .insert(task)
        .select()
        .single();
      if (error) throw error;
      const primaryId = data.contact_id ?? null;
      const extraIds = (additional_contact_ids ?? []).filter(
        (id) => id && id !== primaryId
      );
      if (extraIds.length > 0) {
        await supabase.from("task_contacts").insert(
          extraIds.map((contact_id) => ({ task_id: data.id, contact_id }))
        );
      }
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useUpdateTask() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateTables<"tasks">;
    }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useSetTaskAdditionalContacts() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      additional_contact_ids,
      primary_contact_id,
    }: {
      taskId: string;
      additional_contact_ids: string[];
      primary_contact_id: string | null;
    }) => {
      await supabase.from("task_contacts").delete().eq("task_id", taskId);
      const extraIds = additional_contact_ids.filter(
        (id) => id && id !== primary_contact_id
      );
      if (extraIds.length > 0) {
        await supabase.from("task_contacts").insert(
          extraIds.map((contact_id) => ({ task_id: taskId, contact_id }))
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useCompleteTask() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("tasks")
        .update({
          status: "done",
          completed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteTask() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
