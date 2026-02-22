"use client";

import { useState, useMemo } from "react";
import { Command } from "cmdk";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Search, UserPlus, X } from "lucide-react";

interface Contact {
  id: string;
  first_name: string;
  last_name: string | null;
  company_name: string | null;
}

interface ContactMultiSelectProps {
  contacts: Contact[] | undefined;
  value: string[];
  onValueChange: (ids: string[]) => void;
  placeholder?: string;
  className?: string;
  /** Contact IDs to exclude from the list (e.g. primary contact so they aren't added twice) */
  excludeIds?: string[];
}

export function ContactMultiSelect({
  contacts,
  value,
  onValueChange,
  placeholder = "Add contacts...",
  className,
  excludeIds = [],
}: ContactMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedContacts = useMemo(() => {
    if (!contacts || value.length === 0) return [];
    return value
      .map((id) => contacts.find((c) => c.id === id))
      .filter(Boolean) as Contact[];
  }, [contacts, value]);

  const excludedSet = useMemo(
    () => new Set([...value, ...excludeIds]),
    [value, excludeIds]
  );

  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    const list = contacts.filter((c) => !excludedSet.has(c.id));
    if (!search) return list;
    const searchLower = search.toLowerCase();
    return list.filter((contact) => {
      const fullName = `${contact.first_name} ${contact.last_name || ""}`.toLowerCase();
      const company = contact.company_name?.toLowerCase() || "";
      return fullName.includes(searchLower) || company.includes(searchLower);
    });
  }, [contacts, search, excludedSet, excludeIds]);

  const handleAdd = (contactId: string) => {
    if (value.includes(contactId)) return;
    onValueChange([...value, contactId]);
    setSearch("");
  };

  const handleRemove = (contactId: string) => {
    onValueChange(value.filter((id) => id !== contactId));
  };

  return (
    <div className={cn("space-y-2", className)}>
      {selectedContacts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedContacts.map((c) => (
            <Badge
              key={c.id}
              variant="secondary"
              className="gap-1 pr-1 font-normal"
            >
              {c.first_name} {c.last_name}
              <button
                type="button"
                onClick={() => handleRemove(c.id)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                aria-label={`Remove ${c.first_name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start font-normal text-muted-foreground"
          >
            <UserPlus className="mr-2 h-4 w-4 shrink-0" />
            {placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder="Search contacts..."
                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="p-1 hover:bg-muted rounded"
                >
                  <X className="h-3 w-3 opacity-50" />
                </button>
              )}
            </div>
            <Command.List className="max-h-[200px] overflow-y-auto overflow-x-hidden p-1">
              <Command.Empty className="py-4 text-center text-sm text-muted-foreground">
                No contacts found.
              </Command.Empty>
              {filteredContacts.map((contact) => (
                <Command.Item
                  key={contact.id}
                  value={`${contact.id} ${contact.first_name} ${contact.last_name || ""} ${contact.company_name || ""}`}
                  onSelect={() => handleAdd(contact.id)}
                  className="cursor-pointer rounded-md px-2 py-2 text-sm hover:bg-muted aria-selected:bg-muted"
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 text-xs font-medium shrink-0">
                      {contact.first_name?.[0]}
                      {contact.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="truncate">
                        {contact.first_name} {contact.last_name}
                      </span>
                      {contact.company_name && (
                        <span className="text-muted-foreground text-xs ml-1">
                          • {contact.company_name}
                        </span>
                      )}
                    </div>
                  </div>
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
