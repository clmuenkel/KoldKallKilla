"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateCompany } from "@/hooks/use-companies";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { INDUSTRIES, EMPLOYEE_RANGES } from "@/lib/constants";
import { DEFAULT_USER_ID } from "@/lib/default-user";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  domain: z.string().optional(),
  industry: z.string().optional(),
  employee_range: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

interface CompanyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompanyForm({ open, onOpenChange }: CompanyFormProps) {
  const createCompany = useCreateCompany();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      domain: "",
      industry: "",
      employee_range: "",
      city: "",
      state: "",
      notes: "",
    },
  });

  const onSubmit = async (data: CompanyFormValues) => {
    try {
      await createCompany.mutateAsync({
        user_id: DEFAULT_USER_ID,
        name: data.name,
        domain: data.domain || null,
        industry: data.industry || null,
        employee_range: data.employee_range || null,
        city: data.city || null,
        state: data.state || null,
        notes: data.notes || null,
      });
      toast.success("Company created!");
      reset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create company");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Company</DialogTitle>
          <DialogDescription>
            Create a new company to organize your contacts
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Company Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Acme Corporation"
              {...register("name")}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">Website Domain</Label>
            <Input
              id="domain"
              placeholder="e.g., acme.com"
              {...register("domain")}
            />
            <p className="text-xs text-muted-foreground">
              Used to match contacts by email
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Industry</Label>
              <Select
                value={watch("industry") || ""}
                onValueChange={(v) => setValue("industry", v)}
              >
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
              <Label>Size</Label>
              <Select
                value={watch("employee_range") || ""}
                onValueChange={(v) => setValue("employee_range", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label} employees
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="e.g., San Francisco"
                {...register("city")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                placeholder="e.g., CA"
                {...register("state")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any relevant notes about this company..."
              {...register("notes")}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCompany.isPending}>
              {createCompany.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Company
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
