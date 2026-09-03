"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ConnectionMode } from "@/lib/types";

export type SettingsState = {
  mode: ConnectionMode;
  businessName: string;
  phoneNumberId: string;
  verifyToken: string;
  accessTokenMasked: string | null;
  accessTokenSet: boolean;
  webhookPath: string;
};

function useOrigin() {
  return useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
}

export function SettingsForm({ initial }: { initial: SettingsState }) {
  const origin = useOrigin();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [settings, setSettings] = useState<SettingsState>(initial);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: settings.businessName,
          phoneNumberId: settings.phoneNumberId,
          verifyToken: settings.verifyToken,
          accessToken: accessToken || undefined,
        }),
      });
      const payload = (await response.json()) as SettingsState & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Could not save settings.");
      }
      setSettings(payload);
      setAccessToken("");
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  const webhookUrl = `${origin}${settings.webhookPath}`;

  return (
    <AppShell mode={settings.mode}>
      <Button asChild variant="ghost" size="sm" className="mb-4 w-fit">
        <Link href="/">
          <ArrowLeft data-icon="inline-start" />
          Back to updates
        </Link>
      </Button>

      <div className="mb-6 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">WhatsApp connection</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connect Meta&apos;s WhatsApp Cloud API to send real status updates. Leave the token blank
          to keep using demo mode.
        </p>
      </div>

      {error ? (
        <Alert className="mb-6 max-w-2xl" variant="destructive">
          <AlertTitle>Settings error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {saved ? (
        <Alert className="mb-6 max-w-2xl">
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>
            {settings.mode === "live"
              ? "Relay will send the next update through WhatsApp Cloud API."
              : "Still in demo mode. Add both an access token and a phone number ID to go live."}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid max-w-2xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Business profile</CardTitle>
            <CardDescription>This name is signed at the bottom of every status message.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business name</Label>
              <Input
                id="businessName"
                value={settings.businessName}
                onChange={(event) => setSettings((current) => ({ ...current, businessName: event.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cloud API credentials</CardTitle>
            <CardDescription>
              From Meta Business Suite: WhatsApp &gt; API Setup. Environment variables override
              anything saved here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumberId">Phone number ID</Label>
              <Input
                id="phoneNumberId"
                value={settings.phoneNumberId}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, phoneNumberId: event.target.value }))
                }
                placeholder="123456789012345"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessToken">Access token</Label>
              <Input
                id="accessToken"
                type="password"
                value={accessToken}
                onChange={(event) => setAccessToken(event.target.value)}
                placeholder={
                  settings.accessTokenSet
                    ? `Saved ${settings.accessTokenMasked ?? "token"} — paste a new one to replace`
                    : "Paste a temporary or system user token"
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="verifyToken">Webhook verify token</Label>
              <Input
                id="verifyToken"
                value={settings.verifyToken}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, verifyToken: event.target.value }))
                }
              />
            </div>
            <Button disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Save connection"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receive customer replies</CardTitle>
            <CardDescription>
              In Meta, set the callback URL to this webhook and use the same verify token.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label>Callback URL</Label>
            <code className="block overflow-x-auto rounded-lg bg-muted px-3 py-2 font-mono text-xs">
              {webhookUrl}
            </code>
            <p className="text-xs text-muted-foreground">
              Subscribe to the <span className="font-mono">messages</span> field. Replies show up on
              the activity feed within a few seconds.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
