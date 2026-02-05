"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useContacts } from "@/hooks/use-contacts";
import { useCompanies } from "@/hooks/use-companies";
import { useTasks } from "@/hooks/use-tasks";
import { Command } from "cmdk";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  LayoutDashboard,
  Users,
  Phone,
  Kanban,
  CheckSquare,
  Mail,
  Download,
  Settings,
  Plus,
  Search,
  User,
  Building2,
  Calendar,
  BarChart3,
  Clock,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, StageBadge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

const pages = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, keywords: "home overview stats" },
  { name: "Contacts", href: "/contacts", icon: Users, keywords: "people leads prospects" },
  { name: "Companies", href: "/companies", icon: Building2, keywords: "organizations accounts" },
  { name: "Power Dialer", href: "/dialer", icon: Phone, keywords: "call calling" },
  { name: "Pipeline", href: "/pipeline", icon: Kanban, keywords: "deals stages board" },
  { name: "Tasks", href: "/tasks", icon: CheckSquare, keywords: "todo todos followup" },
  { name: "Calendar", href: "/calendar", icon: Calendar, keywords: "schedule meetings" },
  { name: "Meetings", href: "/meetings", icon: Calendar, keywords: "appointments" },
  { name: "Analytics", href: "/analytics", icon: BarChart3, keywords: "stats reports metrics" },
  { name: "Email Templates", href: "/templates", icon: FileText, keywords: "emails messages" },
  { name: "Import", href: "/import", icon: Download, keywords: "apollo csv upload" },
  { name: "Settings", href: "/settings", icon: Settings, keywords: "preferences config" },
];

const actions = [
  { name: "New Contact", action: "/contacts/new", icon: Plus, keywords: "add create" },
  { name: "New Task", action: "/tasks?new=true", icon: Plus, keywords: "add create" },
  { name: "Start Calling Session", action: "/dialer", icon: Phone, keywords: "dial call" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  
  // Search across contacts, companies, and tasks
  const { data: contacts } = useContacts({ search: search, limit: 5 });
  const { data: companies } = useCompanies({ search: search, limit: 5 });
  const { data: tasks } = useTasks({ status: "todo", limit: 5 });

  // Filter tasks by search term
  const filteredTasks = tasks?.filter(task => 
    search && (
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      task.description?.toLowerCase().includes(search.toLowerCase())
    )
  ).slice(0, 5);

  // Recent pages (could be stored in localStorage)
  const [recentPages, setRecentPages] = useState<string[]>([]);

  // Toggle the menu with ⌘K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback((command: () => void, pageName?: string) => {
    setOpen(false);
    setSearch("");
    if (pageName) {
      setRecentPages(prev => {
        const filtered = prev.filter(p => p !== pageName);
        return [pageName, ...filtered].slice(0, 3);
      });
    }
    command();
  }, []);

  const hasResults = (contacts && contacts.length > 0) || 
                     (companies && companies.length > 0) || 
                     (filteredTasks && filteredTasks.length > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 shadow-lg max-w-xl">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search contacts, companies, tasks, or pages..."
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
          <Command.List className="max-h-[400px] overflow-y-auto overflow-x-hidden">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found for "{search}"
            </Command.Empty>

            {/* Quick Actions - shown when no search */}
            {!search && (
              <Command.Group heading="Quick Actions">
                {actions.map((action) => (
                  <Command.Item
                    key={action.name}
                    value={`${action.name} ${action.keywords}`}
                    onSelect={() => runCommand(() => router.push(action.action))}
                    className="cursor-pointer rounded-md hover:bg-muted"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                        <action.icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">{action.name}</span>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Contacts */}
            {contacts && contacts.length > 0 && (
              <Command.Group heading="Contacts">
                {contacts.map((contact) => (
                  <Command.Item
                    key={contact.id}
                    value={`contact ${contact.first_name} ${contact.last_name} ${contact.company_name || ""} ${contact.email || ""} ${contact.phone || ""} ${contact.mobile || ""}`}
                    onSelect={() => runCommand(() => router.push(`/contacts/${contact.id}`), `Contact: ${contact.first_name}`)}
                    className="cursor-pointer rounded-md hover:bg-muted"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 text-xs font-medium">
                        {contact.first_name?.[0]}{contact.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {contact.first_name} {contact.last_name}
                          </span>
                          {contact.stage && (
                            <StageBadge 
                              stage={contact.stage as "fresh" | "contacted" | "qualified" | "meeting" | "proposal" | "won" | "lost"} 
                              size="sm"
                            />
                          )}
                        </div>
                        {(contact.company_name || contact.title) && (
                          <p className="text-xs text-muted-foreground truncate">
                            {contact.title}{contact.title && contact.company_name && " at "}{contact.company_name}
                          </p>
                        )}
                        {(contact.phone || contact.mobile) && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {contact.mobile || contact.phone}
                          </p>
                        )}
                      </div>
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Companies */}
            {companies && companies.length > 0 && search && (
              <Command.Group heading="Companies">
                {companies.map((company) => (
                  <Command.Item
                    key={company.id}
                    value={`company ${company.name} ${company.industry || ""} ${company.domain || ""}`}
                    onSelect={() => runCommand(() => router.push(`/companies/${company.id}`), `Company: ${company.name}`)}
                    className="cursor-pointer rounded-md hover:bg-muted"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{company.name}</span>
                          {company.contact_count > 0 && (
                            <Badge variant="secondary" className="text-[10px] h-5">
                              {company.contact_count} contact{company.contact_count !== 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                        {(company.industry || company.employee_range) && (
                          <p className="text-xs text-muted-foreground truncate">
                            {company.industry}{company.industry && company.employee_range && " • "}{company.employee_range && `${company.employee_range} employees`}
                          </p>
                        )}
                      </div>
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Tasks */}
            {filteredTasks && filteredTasks.length > 0 && (
              <Command.Group heading="Tasks">
                {filteredTasks.map((task) => (
                  <Command.Item
                    key={task.id}
                    value={`task ${task.title} ${task.description || ""}`}
                    onSelect={() => runCommand(() => router.push(`/tasks?task=${task.id}`), `Task: ${task.title}`)}
                    className="cursor-pointer rounded-md hover:bg-muted"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-md",
                        task.priority === "urgent" ? "bg-red-500/10 text-red-600" :
                        task.priority === "high" ? "bg-orange-500/10 text-orange-600" :
                        "bg-emerald-500/10 text-emerald-600"
                      )}>
                        <CheckSquare className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{task.title}</span>
                          {task.priority && task.priority !== "medium" && (
                            <Badge 
                              variant={task.priority === "urgent" ? "destructive" : "secondary"} 
                              className="text-[10px] h-5"
                            >
                              {task.priority}
                            </Badge>
                          )}
                        </div>
                        {task.due_date && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Due {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                      <CheckSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Pages */}
            <Command.Group heading="Pages">
              {pages.map((page) => (
                <Command.Item
                  key={page.href}
                  value={`page ${page.name} ${page.keywords}`}
                  onSelect={() => runCommand(() => router.push(page.href), page.name)}
                  className="cursor-pointer rounded-md hover:bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                      <page.icon className="h-4 w-4" />
                    </div>
                    <span>{page.name}</span>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
          
          {/* Footer with hints */}
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Navigate:</span>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">↑↓</kbd>
            </div>
            <div className="flex items-center gap-2">
              <span>Select:</span>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd>
            </div>
            <div className="flex items-center gap-2">
              <span>Close:</span>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd>
            </div>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
