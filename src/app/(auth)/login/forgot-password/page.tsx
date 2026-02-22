"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Phone, Loader2, ArrowLeft, MailCheck } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${appUrl}/login/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-border bg-card/80 backdrop-blur">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
          <Phone className="h-6 w-6 text-primary-foreground" />
        </div>
        <CardTitle className="text-2xl">Reset Password</CardTitle>
        <CardDescription>
          {sent
            ? "Check your email for a reset link"
            : "Enter your email and we'll send you a reset link"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <MailCheck className="h-12 w-12 text-primary" />
            <p className="text-sm text-center text-muted-foreground">
              We sent a password reset link to <strong>{email}</strong>. Check your inbox and click
              the link to set a new password.
            </p>
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Link
            </Button>
            <div className="text-center">
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
