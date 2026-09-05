"use client";

import { useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { HermesBridgeStatus } from "@/lib/types";

type PairState = {
  configured: boolean;
  status: HermesBridgeStatus;
  qrDataUrl: string | null;
  userName: string | null;
  userId: string | null;
  detail: string | null;
};

export function HermesPairing({
  hermesUrl,
  hermesStatus,
}: {
  hermesUrl: string;
  hermesStatus: HermesBridgeStatus;
}) {
  const [pair, setPair] = useState<PairState | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const response = await fetch("/api/hermes/pair", { cache: "no-store" });
        const payload = (await response.json()) as PairState;
        if (!cancelled) setPair(payload);
      } catch {
        if (!cancelled) {
          setPair({
            configured: Boolean(hermesUrl),
            status: hermesStatus,
            qrDataUrl: null,
            userName: null,
            userId: null,
            detail: "Could not load the pairing QR.",
          });
        }
      }
    }

    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [hermesUrl, hermesStatus]);

  const status = pair?.status ?? hermesStatus;
  const connected = status === "connected";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scan WhatsApp QR</CardTitle>
        <CardDescription>
          Pair a dedicated bot number here. The same QR works locally and on the Vercel
          deployment, as long as Relay can reach the Hermes front over HTTPS.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connected ? (
          <Alert>
            <AlertTitle>WhatsApp is live</AlertTitle>
            <AlertDescription>
              {pair?.userName
                ? `Connected as ${pair.userName}.`
                : "The Hermes bridge is connected. Status updates will send from this number."}
            </AlertDescription>
          </Alert>
        ) : pair?.qrDataUrl ? (
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <img
              src={pair.qrDataUrl}
              alt="WhatsApp pairing QR code"
              width={224}
              height={224}
              className="rounded-lg bg-white p-2 ring-1 ring-foreground/10"
            />
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Open WhatsApp on the bot phone.</li>
              <li>Go to Settings → Linked devices → Link a device.</li>
              <li>Scan this code. It refreshes automatically.</li>
            </ol>
          </div>
        ) : (
          <Alert>
            <AlertTitle>
              {status === "unreachable" ? "Hermes is not reachable" : "Waiting for a pairing code"}
            </AlertTitle>
            <AlertDescription>
              {pair?.detail ||
                "Start the Hermes front with npm run hermes. On Vercel, set HERMES_WHATSAPP_URL to that public HTTPS address — 127.0.0.1 will not work from Vercel."}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
