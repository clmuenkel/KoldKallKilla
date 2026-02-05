"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { PageHeader } from "@/components/layout/page-header";
import { CompanyList } from "@/components/companies/company-list";
import { CompanyForm } from "@/components/companies/company-form";
import { Button } from "@/components/ui/button";
import { Upload, Plus } from "lucide-react";
import Link from "next/link";

export default function CompaniesPage() {
  const [companyFormOpen, setCompanyFormOpen] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <Header title="Companies" />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <PageHeader
          title="All Companies"
          description="View and manage all your target companies and their contacts"
          actions={
            <>
              <Button onClick={() => setCompanyFormOpen(true)} className="press-scale">
                <Plus className="h-4 w-4 mr-2" />
                New Company
              </Button>
              <Link href="/import">
                <Button variant="outline" className="press-scale">
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
              </Link>
            </>
          }
        />

        <div 
          className="opacity-0 animate-fade-in"
          style={{ animationDelay: "50ms", animationFillMode: "forwards" }}
        >
          <CompanyList />
        </div>
      </div>

      <CompanyForm open={companyFormOpen} onOpenChange={setCompanyFormOpen} />
    </div>
  );
}
