"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, Save, User, Key, Bell } from "lucide-react";
import { DEFAULT_USER_ID } from "@/lib/default-user";

export default function SettingsPage() {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Profile
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("user@pezcrm.local");
  const [phone, setPhone] = useState("");
  const [calendarLink, setCalendarLink] = useState("");

  // API Keys
  const [apolloApiKey, setApolloApiKey] = useState("");

  // Goals
  const [dailyCallGoal, setDailyCallGoal] = useState(50);
  const [dailyEmailGoal, setDailyEmailGoal] = useState(20);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", DEFAULT_USER_ID)
          .single();

        if (profile) {
          setFullName(profile.full_name || "");
          setPhone(profile.phone || "");
          setCalendarLink(profile.calendar_link || "");
          setDailyCallGoal(profile.daily_call_goal || 50);
          setDailyEmailGoal(profile.daily_email_goal || 20);
        }

        // Load settings
        const { data: settings } = await supabase
          .from("user_settings")
          .select("*")
          .eq("user_id", DEFAULT_USER_ID)
          .single();

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
          id: DEFAULT_USER_ID,
          full_name: fullName,
          phone,
          calendar_link: calendarLink,
          daily_call_goal: dailyCallGoal,
          daily_email_goal: dailyEmailGoal,
        });

      // Update settings
      await supabase
        .from("user_settings")
        .upsert({
          user_id: DEFAULT_USER_ID,
          apollo_api_key: apolloApiKey,
        });

      toast.success("Settings saved!");
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Settings" />
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-2xl space-y-6">
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
        <div className="max-w-2xl space-y-6">
          {/* Profile */}
          <Card
            className="opacity-0 animate-fade-in"
            style={{ animationDelay: "0ms", animationFillMode: "forwards" }}
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
            style={{ animationDelay: "50ms", animationFillMode: "forwards" }}
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
            style={{ animationDelay: "100ms", animationFillMode: "forwards" }}
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

          <Separator />

          {/* Save */}
          <div 
            className="flex justify-end opacity-0 animate-fade-in"
            style={{ animationDelay: "150ms", animationFillMode: "forwards" }}
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
