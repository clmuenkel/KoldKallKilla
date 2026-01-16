"use client";

import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { ContactForm } from "@/components/contacts/contact-form";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateContact } from "@/hooks/use-contacts";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export default function NewContactPage() {
  const router = useRouter();
  const createContact = useCreateContact();
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, [supabase]);

  const handleSubmit = async (data: any) => {
    if (!userId) {
      toast.error("Not authenticated");
      return;
    }

    try {
      const contact = await createContact.mutateAsync({
        ...data,
        user_id: userId,
      });
      toast.success("Contact created!");
      router.push(`/contacts/${contact.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create contact");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="New Contact" />
      
      <div className="flex-1 p-6">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <ContactForm
              onSubmit={handleSubmit}
              isLoading={createContact.isPending}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
