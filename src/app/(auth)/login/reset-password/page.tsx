"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Phone, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // createBrowserClient from @supabase/ssr does not auto-process hash tokens.
    // Parse the hash manually and call setSession to establish the session.
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token") ?? "";
      if (accessToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ data }) => {
            if (data.session) setIsReady(true);
          });
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setIsReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setIsDone(true);
      toast.success("Password updated successfully");
      setTimeout(() => router.push("/dashboard"), 2000);
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
        <CardTitle className="text-2xl">Set New Password</CardTitle>
        <CardDescription>
          {isDone ? "Password updated — redirecting..." : "Choose a new password for your account"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isDone ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <ShieldCheck className="h-12 w-12 text-primary" />
            <p className="text-sm text-center text-muted-foreground">
              Your password has been updated. Taking you to the dashboard...
            </p>
          </div>
        ) : !isReady ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-center text-muted-foreground">
              Verifying reset link...
            </p>
            <p className="text-xs text-center text-muted-foreground">
              If nothing happens,{" "}
              <Link href="/login/forgot-password" className="underline hover:text-foreground">
                request a new link
              </Link>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
