import { getWhatsAppConfig, isHermesConfigured, maskSecret } from "@/lib/config";
import { probeHermesHealth } from "@/lib/hermes";
import { ingestHermesInbox } from "@/lib/inbox";
import { listCustomers, listUpdates } from "@/lib/store";
import type { ConnectionStatus, Customer, StatusUpdate } from "@/lib/types";

export async function getConnectionStatus(): Promise<ConnectionStatus> {
  const config = await getWhatsAppConfig();
  const health = await probeHermesHealth(config);
  return {
    mode: health.connected ? "live" : "demo",
    configured: health.configured,
    businessName: config.businessName,
    hermesUrl: config.hermesUrl,
    hermesStatus: health.status,
    webhookPath: "/api/webhook/hermes",
  };
}

export async function getDeskData(): Promise<{
  status: ConnectionStatus;
  customers: Customer[];
  updates: StatusUpdate[];
}> {
  await ingestHermesInbox();
  const [status, customers, updates] = await Promise.all([
    getConnectionStatus(),
    listCustomers(),
    listUpdates(),
  ]);
  return { status, customers, updates };
}

export async function getSettingsData() {
  const config = await getWhatsAppConfig();
  const health = await probeHermesHealth(config);
  return {
    mode: health.connected ? "live" : "demo",
    businessName: config.businessName,
    hermesUrl: config.hermesUrl,
    hermesWebhookSecretSet: Boolean(config.hermesWebhookSecret),
    hermesWebhookSecretMasked: maskSecret(config.hermesWebhookSecret),
    hermesStatus: health.status,
    hermesDetail: health.detail ?? null,
    webhookPath: "/api/webhook/hermes",
    configured: isHermesConfigured(config),
  } as const;
}
