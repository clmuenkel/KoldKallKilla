export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatDateForDB } from "@/lib/utils";

/**
 * POST /api/backfill/task-due-dates
 * Backfill tasks with weekend due dates to move them to Monday
 */
export async function POST() {
  try {
    const supabase = createClient();

    // Fetch all tasks with a due_date set
    const { data: tasksData, error: fetchError } = await supabase
      .from("tasks")
      .select("id, due_date")
      .not("due_date", "is", null);

    if (fetchError) {
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    const tasks = tasksData ?? [];

    if (tasks.length === 0) {
      return NextResponse.json({
        message: "No tasks with due dates found",
        updated: 0,
        skipped: 0,
        errors: 0,
      });
    }

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Process each task
    for (const task of tasks) {
      if (!task.due_date) {
        skipped++;
        continue;
      }

      // Parse the date and check if it's a weekend
      const date = new Date(task.due_date + "T00:00:00");
      const day = date.getDay(); // 0 = Sunday, 6 = Saturday

      if (day !== 0 && day !== 6) {
        // Not a weekend, skip
        skipped++;
        continue;
      }

      // Move to Monday
      if (day === 0) {
        // Sunday -> Monday (+1 day)
        date.setDate(date.getDate() + 1);
      } else if (day === 6) {
        // Saturday -> Monday (+2 days)
        date.setDate(date.getDate() + 2);
      }

      const newDueDate = formatDateForDB(date);

      // Update the task
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ due_date: newDueDate })
        .eq("id", task.id);

      if (updateError) {
        console.error(`Failed to update task ${task.id}:`, updateError);
        errors++;
      } else {
        updated++;
      }
    }

    return NextResponse.json({
      message: "Backfill complete",
      total: tasks.length,
      updated,
      skipped,
      errors,
    });
  } catch (error: any) {
    console.error("Task due date backfill error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to backfill task due dates" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/backfill/task-due-dates
 * Preview how many tasks have weekend due dates
 */
export async function GET() {
  try {
    const supabase = createClient();

    // Fetch all tasks with a due_date set
    const { data: tasksData, error: fetchError } = await supabase
      .from("tasks")
      .select("id, due_date, title")
      .not("due_date", "is", null);

    if (fetchError) {
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    const tasks = tasksData ?? [];

    let saturdayCount = 0;
    let sundayCount = 0;
    const weekendTasks: { id: string; title: string; due_date: string; day: string }[] = [];

    for (const task of tasks) {
      if (!task.due_date) continue;

      const date = new Date(task.due_date + "T00:00:00");
      const day = date.getDay();

      if (day === 0) {
        sundayCount++;
        weekendTasks.push({
          id: task.id,
          title: task.title,
          due_date: task.due_date,
          day: "Sunday",
        });
      } else if (day === 6) {
        saturdayCount++;
        weekendTasks.push({
          id: task.id,
          title: task.title,
          due_date: task.due_date,
          day: "Saturday",
        });
      }
    }

    return NextResponse.json({
      totalTasks: tasks.length,
      weekendDueDates: saturdayCount + sundayCount,
      saturdayCount,
      sundayCount,
      // Only show first 20 for preview
      preview: weekendTasks.slice(0, 20),
    });
  } catch (error: any) {
    console.error("Task due date backfill preview error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to preview backfill" },
      { status: 500 }
    );
  }
}
