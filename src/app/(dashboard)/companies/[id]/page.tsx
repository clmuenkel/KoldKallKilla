"use client";

import { useParams, useRouter } from "next/navigation";
import { useCompany, useCompanyCallHistory } from "@/hooks/use-companies";
import { CompanyCard, CompanyCardSkeleton } from "@/components/companies/company-card";
import { CompanyContacts } from "@/components/companies/company-contacts";
import { CompanyCallHistory } from "@/components/companies/company-call-history";
import { MeetingsList } from "@/components/meetings/meetings-list";
import { DEFAULT_USER_ID } from "@/lib/default-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Users, 
  Phone, 
  Upload,
  History,
  Calendar,
} from "lucide-react";
import Link from "next/link";

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const userId = DEFAULT_USER_ID;
  const { data: company, isLoading: loadingCompany } = useCompany(companyId);
  const { data: callHistory, isLoading: loadingCalls } = useCompanyCallHistory(companyId);

  const handleStartCall = (contactId: string) => {
    router.push(`/dialer?contact=${contactId}`);
  };

  if (loadingCompany) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <CompanyCardSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Company not found</p>
        <Link href="/companies">
          <Button variant="link">Go back to companies</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{company.name}</h1>
          <p className="text-muted-foreground">{company.domain}</p>
        </div>
        <Link href={`/import?company=${company.domain}`}>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import More Contacts
          </Button>
        </Link>
      </div>

      {/* Company Card */}
      <CompanyCard 
        company={company} 
        contactCount={company.contact_count}
        lastContactedAt={company.last_contacted_at}
      />

      {/* Tabs */}
      <Tabs defaultValue="contacts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contacts" className="gap-2">
            <Users className="h-4 w-4" />
            Contacts ({company.contacts?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="meetings" className="gap-2">
            <Calendar className="h-4 w-4" />
            Meetings
          </TabsTrigger>
          <TabsTrigger value="calls" className="gap-2">
            <History className="h-4 w-4" />
            Call History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Contacts at {company.name}</span>
                <Link href={`/contacts/new?company=${company.id}`}>
                  <Button variant="outline" size="sm">
                    Add Contact
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CompanyContacts 
                contacts={company.contacts || []}
                onStartCall={handleStartCall}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meetings">
          <MeetingsList
            companyId={companyId}
            userId={userId}
            title={`Meetings with ${company.name}`}
            showScheduleButton={false}
          />
        </TabsContent>

        <TabsContent value="calls">
          <Card>
            <CardHeader>
              <CardTitle>Call History</CardTitle>
            </CardHeader>
            <CardContent>
              <CompanyCallHistory 
                calls={callHistory || []}
                isLoading={loadingCalls}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Talked To Section */}
      {company.talked_to && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reference Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">
                  {company.talked_to.first_name} {company.talked_to.last_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {company.talked_to.title}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Last spoke: {company.talked_to.last_contacted_at 
                  ? new Date(company.talked_to.last_contacted_at).toLocaleDateString()
                  : "Never"}
              </p>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Use this person as a reference when calling other contacts at this company.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
