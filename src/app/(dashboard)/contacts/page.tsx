"use client";

import { Header } from "@/components/layout/header";
import { ContactList } from "@/components/contacts/contact-list";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function ContactsPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Contacts" />
      
      <div className="flex-1 p-6">
        <div 
          className="flex justify-between items-center mb-6 opacity-0 animate-fade-in"
          style={{ animationDelay: "0ms", animationFillMode: "forwards" }}
        >
          <div>
            <h2 className="text-lg font-semibold">All Contacts</h2>
            <p className="text-sm text-muted-foreground">
              Manage your leads and contacts
            </p>
          </div>
          <Link href="/contacts/new">
            <Button className="press-scale">
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </Link>
        </div>

        <div 
          className="opacity-0 animate-fade-in"
          style={{ animationDelay: "50ms", animationFillMode: "forwards" }}
        >
          <ContactList />
        </div>
      </div>
    </div>
  );
}
