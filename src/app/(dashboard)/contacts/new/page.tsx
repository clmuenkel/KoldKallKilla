"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { ContactForm } from "@/components/contacts/contact-form";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateContact } from "@/hooks/use-contacts";
import { useCreateNote } from "@/hooks/use-notes";
import { useCompany } from "@/hooks/use-companies";
import { DEFAULT_USER_ID } from "@/lib/default-user";
import { toast } from "sonner";

export default function NewContactPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyId = searchParams.get("company");

  const createContact = useCreateContact();
  const createNote = useCreateNote();
  const { data: company, isLoading: loadingCompany } = useCompany(companyId || "");

  const userId = DEFAULT_USER_ID;

  const handleSubmit = async (data: any) => {
    try {
      const { note, ...contactData } = data;
      const contact = await createContact.mutateAsync({
        ...contactData,
        user_id: userId,
        company_id: companyId || undefined,
      });
      if (note?.trim()) {
        await createNote.mutateAsync({
          user_id: userId,
          contact_id: contact.id,
          content: note.trim(),
          is_pinned: false,
          is_company_wide: false,
        });
      }
      toast.success("Contact created!");
      router.push(`/contacts/${contact.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create contact");
    }
  };

  // Show loading state while fetching company data
  if (companyId && loadingCompany) {
    return (
      <div className="flex flex-col h-full">
        <Header title="New Contact" />
        <div className="flex-1 p-6">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const companyMissingDetails = company && !company.industry && !company.employee_range && !company.city && !company.state;

  return (
    <div className="flex flex-col h-full">
      <Header title={company ? `New Contact at ${company.name}` : "New Contact"} />
      
      <div className="flex-1 p-6">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6 space-y-4">
            {companyMissingDetails && (
              <p className="text-sm text-muted-foreground">
                Company name is pre-filled. Add industry, location, and employee count on the{" "}
                <a href={`/companies/${company.id}`} className="underline hover:no-underline">company page</a> to pre-fill them for future contacts.
              </p>
            )}
            <ContactForm
              onSubmit={handleSubmit}
              isLoading={createContact.isPending}
              defaultCompany={company ? {
                name: company.name,
                industry: company.industry,
                employee_range: company.employee_range,
                city: company.city,
                state: company.state,
              } : undefined}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
