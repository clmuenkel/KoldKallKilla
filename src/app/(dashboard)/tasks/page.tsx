"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { PageHeader } from "@/components/layout/page-header";
import { TaskList } from "@/components/tasks/task-list";
import { TaskForm } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";

export default function TasksPage() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <Header title="Tasks" />
      
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <PageHeader
          title="Task Management"
          description="Track your follow-ups and action items"
          actions={
            <Button onClick={() => setCreateOpen(true)} className="press-scale">
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          }
        />

        <div 
          className="opacity-0 animate-fade-in"
          style={{ animationDelay: "50ms", animationFillMode: "forwards" }}
        >
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              <TaskList filter="all" />
            </TabsContent>
            <TabsContent value="today" className="mt-4">
              <TaskList filter="today" />
            </TabsContent>
            <TabsContent value="upcoming" className="mt-4">
              <TaskList filter="upcoming" />
            </TabsContent>
            <TabsContent value="completed" className="mt-4">
              <TaskList filter="completed" />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <TaskForm open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
