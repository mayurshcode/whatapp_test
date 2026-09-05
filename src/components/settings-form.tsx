"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { HermesPairing } from "@/components/hermes-pairing";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ConnectionMode, HermesBridgeStatus } from "@/lib/types";

export type SettingsState = {
  mode: ConnectionMode;
  businessName: string;
  hermesUrl: string;
  hermesWebhookSecretSet: boolean;
  hermesWebhookSecretMasked: string | null;
  hermesStatus: HermesBridgeStatus;
  hermesDetail: string | null;
  webhookPath: string;
  configured: boolean;
};

function useOrigin() {
  return useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
}

function statusLabel(status: HermesBridgeStatus): string {
  switch (status) {
    case "connected":
      return "Hermes bridge is connected";
    case "connecting":
      return "Hermes is pairing or reconnecting";
    case "disconnected":
      return "Hermes is reachable but WhatsApp is not connected";
    case "unreachable":
      return "Relay cannot reach the Hermes bridge";
    default:
      return "Hermes is not configured";
  }
}

export function SettingsForm({ initial }: { initial: SettingsState }) {
  const origin = useOrigin();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [settings, setSettings] = useState<SettingsState>(initial);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          businessName: settings.businessName,
          hermesUrl: settings.hermesUrl,
          hermesWebhookSecret: webhookSecret || undefined,
        }),
      });
      const text = await response.text();
      let payload: (SettingsState & { error?: string }) | null = null;
      if (text) {
        try {
          payload = JSON.parse(text) as SettingsState & { error?: string };
        } catch {
          throw new Error("Could not save settings. The server returned an invalid response.");
        }
      }
      if (!response.ok) {
        throw new Error(payload?.error || "Could not save settings.");
      }
      if (!payload) {
        throw new Error("Could not save settings. The server returned an empty response.");
      }
      setSettings(payload);
      setWebhookSecret("");
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
        <h1 className="text-2xl font-semibold tracking-tight">Hermes WhatsApp connection</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Relay sends through a Hermes Agent WhatsApp bridge (Baileys session), not Meta Cloud
          API. Scan the QR in this page. On Vercel, point{" "}
          <span className="font-mono">HERMES_WHATSAPP_URL</span> at a public HTTPS URL for that
          always-on bridge — serverless functions cannot keep the WhatsApp socket themselves.
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
              ? "Relay will send and receive the next updates through Hermes."
              : settings.configured
                ? "URL saved. Start the Hermes WhatsApp bridge, then send again."
                : "Still in demo mode. Add the Hermes bridge URL to go live."}
          </AlertDescription>
        </Alert>
      ) : null}

      <Alert className="mb-6 max-w-2xl">
        <AlertTitle>{statusLabel(settings.hermesStatus)}</AlertTitle>
        <AlertDescription>
          {settings.hermesDetail ||
            (settings.hermesStatus === "connected"
              ? "Outbound status updates go to POST /send. Replies are pulled from GET /messages."
              : "Leave the URL blank to keep using demo mode on this machine.")}
        </AlertDescription>
      </Alert>

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
            <CardTitle>Hermes Agent bridge</CardTitle>
            <CardDescription>
              Default local URL is port 3000. On Vercel this must be a public HTTPS host that
              reaches <span className="font-mono">npm run hermes</span>. Environment variables
              override anything saved here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>
                On an always-on machine run{" "}
                <span className="font-mono text-foreground">npm run hermes</span>.
              </li>
              <li>Scan the QR below from a dedicated bot WhatsApp number.</li>
              <li>
                For Vercel, tunnel or host that front and set{" "}
                <span className="font-mono">HERMES_WHATSAPP_URL</span> to the public URL.
              </li>
            </ol>
            <div className="space-y-2">
              <Label htmlFor="hermesUrl">Bridge URL</Label>
              <Input
                id="hermesUrl"
                value={settings.hermesUrl}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, hermesUrl: event.target.value }))
                }
                placeholder="http://127.0.0.1:3000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hermesWebhookSecret">Inbound webhook secret (optional)</Label>
              <Input
                id="hermesWebhookSecret"
                type="password"
                value={webhookSecret}
                onChange={(event) => setWebhookSecret(event.target.value)}
                placeholder={
                  settings.hermesWebhookSecretSet
                    ? `Saved ${settings.hermesWebhookSecretMasked ?? "secret"} — paste a new one to replace`
                    : "Only needed if something POSTs events to Relay"
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Use a dedicated WhatsApp number. Hermes uses the unofficial WhatsApp Web session, so
              avoid bulk outbound. If the Hermes AI gateway is also polling{" "}
              <span className="font-mono">/messages</span>, it will consume replies before this desk
              sees them — run Relay as the only consumer, or forward events to the webhook below.
            </p>
            <Button type="button" disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Save connection"}
            </Button>
          </CardContent>
        </Card>

        <HermesPairing hermesUrl={settings.hermesUrl} hermesStatus={settings.hermesStatus} />

        <Card>
          <CardHeader>
            <CardTitle>Receive customer replies</CardTitle>
            <CardDescription>
              Relay polls Hermes <span className="font-mono">GET /messages</span> every few seconds.
              You can also POST the same event objects here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label>Forwarding URL</Label>
            <code className="block overflow-x-auto rounded-lg bg-muted px-3 py-2 font-mono text-xs">
              {webhookUrl}
            </code>
            <p className="text-xs text-muted-foreground">
              Expected JSON: a message or array with <span className="font-mono">chatId</span>,{" "}
              <span className="font-mono">senderId</span>, <span className="font-mono">senderName</span>,
              and <span className="font-mono">body</span>. If you set a webhook secret, send it as{" "}
              <span className="font-mono">Authorization: Bearer …</span> or{" "}
              <span className="font-mono">x-hermes-secret</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
