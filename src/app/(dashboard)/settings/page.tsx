"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { PageHeader } from "@/components/layout/page-header";
import { createClient } from "@/lib/supabase/client";
import { seedDummyData, clearDummyData } from "@/lib/seed-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, User, Key, Bell, Database, Trash2, Download, AlertTriangle, Lock, UserPlus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuthId } from "@/hooks/use-auth";
import type { Profile } from "@/types/database";

export default function SettingsPage() {
  const userId = useAuthId();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  // Profile
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [calendarLink, setCalendarLink] = useState("");

  // API Keys
  const [apolloApiKey, setApolloApiKey] = useState("");

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // Invite
  const [inviteEmail, setInviteEmail] = useState("");

  // Goals
  const [dailyCallGoal, setDailyCallGoal] = useState(50);
  const [dailyEmailGoal, setDailyEmailGoal] = useState(20);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load auth email
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.email) setEmail(authUser.email);

        // Load profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId!)
          .single();
        
        const profile = profileData as Profile | null;

        if (profile) {
          setFullName(profile.full_name || "");
          setPhone(profile.phone || "");
          setCalendarLink(profile.calendar_link || "");
          setDailyCallGoal(profile.daily_call_goal || 50);
          setDailyEmailGoal(profile.daily_email_goal || 20);
        }

        // Load settings
        const { data: settingsData } = await supabase
          .from("user_settings")
          .select("*")
          .eq("user_id", userId!)
          .single();
        
        const settings = settingsData as { apollo_api_key?: string } | null;

        if (settings) {
          setApolloApiKey(settings.apollo_api_key || "");
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [supabase]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update profile
      await supabase
        .from("profiles")
        .upsert({
          id: userId!,
          full_name: fullName,
          email,
          phone,
          calendar_link: calendarLink,
          daily_call_goal: dailyCallGoal,
          daily_email_goal: dailyEmailGoal,
        } as any);

      // Update settings
      await supabase
        .from("user_settings")
        .upsert({
          user_id: userId!,
          apollo_api_key: apolloApiKey,
        } as any);

      toast.success("Settings saved!");
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmNewPassword("");
      toast.success("Password updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail) {
      toast.error("Enter an email address");
      return;
    }
    setIsSendingInvite(true);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send invite");
      setInviteEmail("");
      toast.success(`Invite sent to ${inviteEmail}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to send invite");
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const results = await seedDummyData(userId!);
      
      if (results.errors.length > 0) {
        console.error("Seed errors:", results.errors);
      }

      toast.success(
        `Created ${results.companies} companies, ${results.contacts} contacts, ${results.calls} calls, and ${results.tasks} tasks!`
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to seed data");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      await clearDummyData(userId!);
      toast.success("All data cleared!");
    } catch (error: any) {
      toast.error(error.message || "Failed to clear data");
    } finally {
      setIsClearing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Settings" />
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="space-y-1">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-64" />
            </div>
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Settings" />
      
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          <PageHeader
            title="Settings"
            description="Manage your profile, API keys, and daily goals"
          />

          {/* Profile */}
          <Card
            className="opacity-0 animate-fade-in"
            style={{ animationDelay: "50ms", animationFillMode: "forwards" }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
              <CardDescription>
                Your personal information used in emails and calls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={email} disabled />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calendarLink">Calendar Link</Label>
                  <Input
                    id="calendarLink"
                    value={calendarLink}
                    onChange={(e) => setCalendarLink(e.target.value)}
                    placeholder="https://calendly.com/..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Keys */}
          <Card 
            id="api"
            className="opacity-0 animate-fade-in"
            style={{ animationDelay: "100ms", animationFillMode: "forwards" }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Connect external services to import leads
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apolloApiKey">Apollo API Key</Label>
                <Input
                  id="apolloApiKey"
                  type="password"
                  value={apolloApiKey}
                  onChange={(e) => setApolloApiKey(e.target.value)}
                  placeholder="Enter your Apollo API key"
                />
                <p className="text-xs text-muted-foreground">
                  Find your API key in Apollo Settings → API
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Goals */}
          <Card
            className="opacity-0 animate-fade-in"
            style={{ animationDelay: "150ms", animationFillMode: "forwards" }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Daily Goals
              </CardTitle>
              <CardDescription>
                Set your daily activity targets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dailyCallGoal">Daily Call Goal</Label>
                  <Input
                    id="dailyCallGoal"
                    type="number"
                    min={1}
                    value={dailyCallGoal}
                    onChange={(e) => setDailyCallGoal(parseInt(e.target.value) || 50)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dailyEmailGoal">Daily Email Goal</Label>
                  <Input
                    id="dailyEmailGoal"
                    type="number"
                    min={1}
                    value={dailyEmailGoal}
                    onChange={(e) => setDailyEmailGoal(parseInt(e.target.value) || 20)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card
            className="opacity-0 animate-fade-in"
            style={{ animationDelay: "150ms", animationFillMode: "forwards" }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                  <Input
                    id="confirmNewPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    minLength={6}
                  />
                </div>
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={isChangingPassword || !newPassword || !confirmNewPassword}
                variant="outline"
                className="gap-2"
              >
                {isChangingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                Update Password
              </Button>
            </CardContent>
          </Card>

          {/* Invite Team Member */}
          <Card
            className="opacity-0 animate-fade-in"
            style={{ animationDelay: "175ms", animationFillMode: "forwards" }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Invite Team Member
              </CardTitle>
              <CardDescription>
                Send an invite link to a new user — they will set their own password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="max-w-sm"
                />
                <Button
                  onClick={handleSendInvite}
                  disabled={isSendingInvite || !inviteEmail}
                  className="gap-2 shrink-0"
                >
                  {isSendingInvite ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  Send Invite
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Invited users will receive an email to activate their account. Their data will be fully separate from yours.
              </p>
            </CardContent>
          </Card>

          <Separator />

          {/* Data Management */}
          <Card
            className="opacity-0 animate-fade-in border-amber-500/50"
            style={{ animationDelay: "200ms", animationFillMode: "forwards" }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Management
                <Badge variant="outline" className="text-amber-600 border-amber-600">
                  Dev Only
                </Badge>
              </CardTitle>
              <CardDescription>
                Seed dummy data for testing or clear all data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleSeedData} 
                  disabled={isSeeding}
                  className="gap-2"
                >
                  {isSeeding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Seed Dummy Data
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      disabled={isClearing}
                      className="gap-2"
                    >
                      {isClearing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Clear All Data
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear All Data</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete ALL data? This includes all contacts, companies, calls, tasks, and notes. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearData}>
                        Yes, Clear All Data
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-sm text-amber-800 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  Seeding will create 5 companies with 17 contacts, some calls, and tasks.
                  Clearing will delete ALL your data permanently.
                </p>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Save */}
          <div 
            className="flex justify-end opacity-0 animate-fade-in"
            style={{ animationDelay: "200ms", animationFillMode: "forwards" }}
          >
            <Button onClick={handleSave} disabled={isSaving} className="press-scale">
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
