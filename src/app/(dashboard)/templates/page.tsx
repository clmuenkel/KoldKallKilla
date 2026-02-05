"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { PageHeader } from "@/components/layout/page-header";
import { useEmailTemplates, useDeleteEmailTemplate } from "@/hooks/use-email-templates";
import { TemplateEditor } from "@/components/emails/template-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EMAIL_TEMPLATE_CATEGORIES } from "@/lib/constants";
import { Plus, MoreHorizontal, Pencil, Trash2, Mail } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import type { EmailTemplate } from "@/types/database";

export default function TemplatesPage() {
  const { data: templates, isLoading } = useEmailTemplates();
  const deleteTemplate = useDeleteEmailTemplate();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setEditorOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate.mutateAsync(id);
      toast.success("Template deleted");
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };

  // Group templates by category
  const templatesByCategory = templates?.reduce((acc, template) => {
    const cat = template.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(template);
    return acc;
  }, {} as Record<string, EmailTemplate[]>);

  return (
    <div className="flex flex-col h-full">
      <Header title="Email Templates" />
      
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <PageHeader
          title="Template Library"
          description="Create and manage your email templates"
          actions={
            <Button onClick={handleCreate} className="press-scale">
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          }
        />

        <div 
          className="opacity-0 animate-fade-in"
          style={{ animationDelay: "50ms", animationFillMode: "forwards" }}
        >
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : !templates || templates.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No templates yet"
              description="Create your first email template to speed up your outreach"
              action={
                <Button onClick={handleCreate} className="press-scale">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </Button>
              }
            />
          ) : (
            <div className="space-y-8">
              {EMAIL_TEMPLATE_CATEGORIES.map((category) => {
                const categoryTemplates = templatesByCategory?.[category.value];
                if (!categoryTemplates || categoryTemplates.length === 0) return null;

                return (
                  <div key={category.value}>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-4">
                      {category.label}
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {categoryTemplates.map((template) => (
                        <Card key={template.id} variant="interactive">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-base">{template.name}</CardTitle>
                                <CardDescription className="text-xs mt-1">
                                  {template.subject_template}
                                </CardDescription>
                              </div>
                              <AlertDialog>
                                <DropdownMenu>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>Template actions</TooltipContent>
                                  </Tooltip>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEdit(template)}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onSelect={(e) => e.preventDefault()}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Template</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{template.name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(template.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {template.body_template}
                            </p>
                            <div className="flex items-center gap-2 mt-3">
                              <Badge variant="secondary" className="text-xs">
                                {category.label}
                              </Badge>
                              {template.use_count > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  Used {template.use_count}x
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <TemplateEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editingTemplate}
      />
    </div>
  );
}
