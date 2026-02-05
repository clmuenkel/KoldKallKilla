"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STAGES, INDUSTRIES } from "@/lib/constants";
import type { Contact } from "@/types/database";
import { Loader2 } from "lucide-react";

const contactSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  linkedin_url: z.string().url().optional().or(z.literal("")),
  title: z.string().optional(),
  company_name: z.string().optional(),
  industry: z.string().optional(),
  employee_range: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  stage: z.string().default("fresh"),
  note: z.string().optional(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

interface ContactFormProps {
  contact?: Contact;
  defaultCompany?: {
    name: string;
    industry?: string | null;
    employee_range?: string | null;
    city?: string | null;
    state?: string | null;
  };
  onSubmit: (data: ContactFormValues) => Promise<void>;
  isLoading?: boolean;
}

export function ContactForm({ contact, defaultCompany, onSubmit, isLoading }: ContactFormProps) {
  const defaultValues = {
    first_name: contact?.first_name || "",
    last_name: contact?.last_name || "",
    email: contact?.email || "",
    phone: contact?.phone || "",
    mobile: contact?.mobile || "",
    linkedin_url: contact?.linkedin_url || "",
    title: contact?.title || "",
    company_name: contact?.company_name || defaultCompany?.name || "",
    industry: contact?.industry || defaultCompany?.industry || "",
    employee_range: contact?.employee_range || defaultCompany?.employee_range || "",
    city: contact?.city || defaultCompany?.city || "",
    state: contact?.state || defaultCompany?.state || "",
    stage: contact?.stage || "fresh",
    note: "",
  };
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues,
  });

  const stage = watch("stage");
  const industry = watch("industry");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Personal Info */}
      <div className="space-y-4">
        <h3 className="font-semibold">Personal Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name *</Label>
            <Input
              id="first_name"
              {...register("first_name")}
              className={errors.first_name ? "border-destructive" : ""}
            />
            {errors.first_name && (
              <p className="text-sm text-destructive">{errors.first_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name</Label>
            <Input id="last_name" {...register("last_name")} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Job Title</Label>
          <Input id="title" placeholder="e.g. VP of Finance" {...register("title")} />
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-4">
        <h3 className="font-semibold">Contact Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" {...register("phone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile</Label>
            <Input id="mobile" type="tel" {...register("mobile")} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            className={errors.email ? "border-destructive" : ""}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="linkedin_url">LinkedIn URL</Label>
          <Input
            id="linkedin_url"
            type="url"
            placeholder="https://linkedin.com/in/..."
            {...register("linkedin_url")}
          />
        </div>
      </div>

      {/* Company Info */}
      <div className="space-y-4">
        <h3 className="font-semibold">Company Information</h3>
        <div className="space-y-2">
          <Label htmlFor="company_name">Company Name</Label>
          <Input id="company_name" {...register("company_name")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Select value={industry} onValueChange={(v) => setValue("industry", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind.value} value={ind.value}>
                    {ind.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="employee_range">Employee Count</Label>
            <Select
              value={watch("employee_range")}
              onValueChange={(v) => setValue("employee_range", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-50">1-50</SelectItem>
                <SelectItem value="51-200">51-200</SelectItem>
                <SelectItem value="201-500">201-500</SelectItem>
                <SelectItem value="501-1000">501-1,000</SelectItem>
                <SelectItem value="1001-5000">1,001-5,000</SelectItem>
                <SelectItem value="5001+">5,001+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" {...register("city")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input id="state" {...register("state")} />
          </div>
        </div>
      </div>

      {/* Optional note (create only) */}
      {!contact && (
        <div className="space-y-4">
          <h3 className="font-semibold">Note (optional)</h3>
          <div className="space-y-2">
            <Label htmlFor="note">Add a note about this contact</Label>
            <Textarea
              id="note"
              placeholder="e.g. Met at conference, interested in Q2 rollout..."
              rows={3}
              {...register("note")}
            />
          </div>
        </div>
      )}

      {/* CRM Status */}
      <div className="space-y-4">
        <h3 className="font-semibold">CRM Status</h3>
        <div className="space-y-2">
          <Label htmlFor="stage">Stage</Label>
          <Select value={stage} onValueChange={(v) => setValue("stage", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {contact ? "Update Contact" : "Create Contact"}
        </Button>
      </div>
    </form>
  );
}
