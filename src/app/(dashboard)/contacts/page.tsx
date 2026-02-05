"use client";

import { Header } from "@/components/layout/header";
import { PageHeader } from "@/components/layout/page-header";
import { ContactList } from "@/components/contacts/contact-list";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function ContactsPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Contacts" />
      
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <PageHeader
          title="All Contacts"
          description="Manage your leads and contacts"
          actions={
            <Link href="/contacts/new">
              <Button className="press-scale">
                <Plus className="mr-2 h-4 w-4" />
                Add Contact
              </Button>
            </Link>
          }
        />

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
