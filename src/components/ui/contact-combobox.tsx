"use client";

import { useState, useMemo } from "react";
import { Command } from "cmdk";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Search, User, X } from "lucide-react";

interface Contact {
  id: string;
  first_name: string;
  last_name: string | null;
  company_name: string | null;
}

interface ContactComboboxProps {
  contacts: Contact[] | undefined;
  value: string | undefined;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function ContactCombobox({
  contacts,
  value,
  onValueChange,
  placeholder = "Select contact...",
  className,
}: ContactComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Find the selected contact
  const selectedContact = useMemo(() => {
    if (!value || value === "__none__" || !contacts) return null;
    return contacts.find((c) => c.id === value);
  }, [value, contacts]);

  // Filter contacts based on search
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    if (!search) return contacts;

    const searchLower = search.toLowerCase();
    return contacts.filter((contact) => {
      const fullName = `${contact.first_name} ${contact.last_name || ""}`.toLowerCase();
      const company = contact.company_name?.toLowerCase() || "";
      return fullName.includes(searchLower) || company.includes(searchLower);
    });
  }, [contacts, search]);

  const handleSelect = (contactId: string) => {
    onValueChange(contactId === "__none__" ? "" : contactId);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !selectedContact && "text-muted-foreground",
            className
          )}
        >
          {selectedContact ? (
            <span className="truncate">
              {selectedContact.first_name} {selectedContact.last_name}
              {selectedContact.company_name && (
                <span className="text-muted-foreground"> • {selectedContact.company_name}</span>
              )}
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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

            {/* No contact option */}
            <Command.Item
              value="__none__ no contact none"
              onSelect={() => handleSelect("__none__")}
              className="cursor-pointer rounded-md px-2 py-2 text-sm hover:bg-muted aria-selected:bg-muted"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <X className="h-3 w-3" />
                </div>
                <span className="text-muted-foreground">No contact</span>
                {(!value || value === "__none__" || value === "") && (
                  <Check className="ml-auto h-4 w-4 text-primary" />
                )}
              </div>
            </Command.Item>

            {/* Contact list */}
            {filteredContacts.map((contact) => (
              <Command.Item
                key={contact.id}
                value={`${contact.id} ${contact.first_name} ${contact.last_name || ""} ${contact.company_name || ""}`}
                onSelect={() => handleSelect(contact.id)}
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
                  {value === contact.id && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
