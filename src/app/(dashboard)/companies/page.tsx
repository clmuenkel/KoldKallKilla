import { CompanyList } from "@/components/companies/company-list";
import { Button } from "@/components/ui/button";
import { Building2, Upload } from "lucide-react";
import Link from "next/link";

export default function CompaniesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Companies
          </h1>
          <p className="text-muted-foreground">
            View and manage all your target companies and their contacts
          </p>
        </div>
        <Link href="/import">
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Import from Apollo
          </Button>
        </Link>
      </div>

      {/* Company List */}
      <CompanyList />
    </div>
  );
}
