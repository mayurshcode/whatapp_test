"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { ActivityFeed } from "@/components/activity-feed";
import { AppShell } from "@/components/app-shell";
import { Composer, type ComposerValues } from "@/components/composer";
import { PhonePreview } from "@/components/phone-preview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import {
  getDeskCacheSnapshot,
  mergeById,
  mergeCustomers,
  readDeskCache,
  subscribeDeskCache,
  writeDeskCache,
} from "@/lib/desk-cache";
import { buildStatusMessage } from "@/lib/templates";
import type { ConnectionStatus, Customer, StatusUpdate } from "@/lib/types";

const EMPTY_VALUES: ComposerValues = {
  customerName: "",
  phone: "",
  reference: "",
  statusId: "shipped",
  note: "",
  customBody: "",
};

export function StatusDesk({
  initialStatus,
  initialCustomers,
  initialUpdates,
}: {
  initialStatus: ConnectionStatus;
  initialCustomers: Customer[];
  initialUpdates: StatusUpdate[];
}) {
  const [status, setStatus] = useState<ConnectionStatus>(initialStatus);
  const [sessionCustomers, setSessionCustomers] = useState<Customer[]>([]);
  const [sessionUpdates, setSessionUpdates] = useState<StatusUpdate[]>([]);
  const [polledCustomers, setPolledCustomers] = useState<Customer[]>(initialCustomers);
  const [polledUpdates, setPolledUpdates] = useState<StatusUpdate[]>(initialUpdates);
  const [values, setValues] = useState<ComposerValues>(EMPTY_VALUES);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const cacheSnapshot = useSyncExternalStore(
    subscribeDeskCache,
    getDeskCacheSnapshot,
    () => "",
  );
  const cached = useMemo(() => {
    if (!cacheSnapshot) return readDeskCache();
    try {
      return JSON.parse(cacheSnapshot) as { customers: Customer[]; updates: StatusUpdate[] };
    } catch {
      return readDeskCache();
    }
  }, [cacheSnapshot]);

  const customers = mergeCustomers(
    sessionCustomers,
    cached?.customers ?? [],
    polledCustomers,
    initialCustomers,
  );
  const updates = mergeById(
    sessionUpdates,
    cached?.updates ?? [],
    polledUpdates,
    initialUpdates,
  );

  const sessionCustomersRef = useRef(sessionCustomers);
  const sessionUpdatesRef = useRef(sessionUpdates);

  useEffect(() => {
    sessionCustomersRef.current = sessionCustomers;
    sessionUpdatesRef.current = sessionUpdates;
  }, [sessionCustomers, sessionUpdates]);

  const persistLocal = useCallback((nextCustomers: Customer[], nextUpdates: StatusUpdate[]) => {
    writeDeskCache({ customers: nextCustomers, updates: nextUpdates });
  }, []);

  const load = useCallback(async () => {
    try {
      const fetchOpts: RequestInit = { cache: "no-store" };
      const [statusRes, customersRes, updatesRes] = await Promise.all([
        fetch("/api/status", fetchOpts),
        fetch("/api/customers", fetchOpts),
        fetch("/api/updates", fetchOpts),
      ]);

      if (!statusRes.ok || !customersRes.ok || !updatesRes.ok) {
        throw new Error("Could not load status updates.");
      }

      const statusJson = (await statusRes.json()) as ConnectionStatus;
      const customersJson = (await customersRes.json()) as { customers: Customer[] };
      const updatesJson = (await updatesRes.json()) as { updates: StatusUpdate[] };

      setStatus(statusJson);
      setPolledCustomers(customersJson.customers);
      setPolledUpdates(updatesJson.updates);
      const existing = readDeskCache();
      writeDeskCache({
        customers: mergeCustomers(
          sessionCustomersRef.current,
          customersJson.customers,
          existing?.customers ?? [],
        ),
        updates: mergeById(
          sessionUpdatesRef.current,
          updatesJson.updates,
          existing?.updates ?? [],
        ),
      });
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load status updates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void load();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [load]);

  const preview = useMemo(
    () =>
      buildStatusMessage({
        customerName: values.customerName,
        reference: values.reference,
        statusId: values.statusId,
        note: values.note,
        customBody: values.customBody,
        businessName: status.businessName || "your store",
      }),
    [status.businessName, values],
  );

  async function sendUpdate() {
    setSending(true);
    setSendError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = (await response.json()) as {
        error?: string;
        update?: StatusUpdate;
        mode?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Could not send the status update.");
      }
      if (payload.update) {
        const nextUpdates = mergeById([payload.update], updates);
        const nextCustomers = mergeCustomers(
          [
            {
              id: payload.update.customerId,
              name: payload.update.customerName,
              phone: payload.update.phone,
              lastReference: payload.update.reference,
              lastStatusId: payload.update.statusId,
              lastContactAt: payload.update.createdAt,
            },
          ],
          customers,
        );
        setSessionUpdates(nextUpdates);
        setSessionCustomers(nextCustomers);
        persistLocal(nextCustomers, nextUpdates);
      }
      setNotice(
        payload.mode === "demo"
          ? "Saved in demo mode. Add WhatsApp Cloud API credentials in Settings to send a real message."
          : `Status update sent to ${values.customerName} on WhatsApp.`,
      );
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Could not send the status update.");
    } finally {
      setSending(false);
    }
  }

  async function simulateReply(update: StatusUpdate, text: string) {
    const response = await fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: update.phone,
        customerName: update.customerName,
        reference: update.reference,
        text,
      }),
    });
    const payload = (await response.json()) as { error?: string; update?: StatusUpdate };
    if (!response.ok) {
      throw new Error(payload.error || "Could not simulate the reply.");
    }
    if (payload.update) {
      const nextUpdates = mergeById([payload.update], updates);
      setSessionUpdates(nextUpdates);
      persistLocal(customers, nextUpdates);
    }
  }

  return (
    <AppShell mode={status.mode}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Tell a customer where their order stands
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Send confirmed, shipped, out-for-delivery, and other status updates straight to the
          customer&apos;s WhatsApp number.
        </p>
      </div>

      {status.mode === "demo" ? (
        <Alert className="mb-6">
          <AlertTitle>Running in demo mode</AlertTitle>
          <AlertDescription>
            Messages stay in this app until you add a WhatsApp Cloud API token and phone number ID
            in Settings. Use Simulate reply to see inbound customer messages.
          </AlertDescription>
        </Alert>
      ) : null}

      {notice ? (
        <Alert className="mb-6">
          <AlertTitle>Update sent</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <Card>
          <CardContent className="px-5 py-1 sm:px-6">
            <Composer
              customers={customers}
              values={values}
              onChange={setValues}
              onSubmit={() => void sendUpdate()}
              sending={sending}
              error={sendError}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <PhonePreview body={preview} customerName={values.customerName} phone={values.phone} />
          <ActivityFeed
            updates={updates}
            loading={loading}
            error={loadError}
            onRetry={() => void load()}
            onSimulateReply={simulateReply}
          />
        </div>
      </div>
    </AppShell>
  );
}
