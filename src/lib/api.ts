import { getWhatsAppConfig, isLiveConfig, maskSecret } from "@/lib/config";
import { listCustomers, listUpdates } from "@/lib/store";
import type { ConnectionStatus, Customer, StatusUpdate } from "@/lib/types";

export async function getConnectionStatus(): Promise<ConnectionStatus> {
  const config = await getWhatsAppConfig();
  const live = isLiveConfig(config);
  return {
    mode: live ? "live" : "demo",
    configured: live,
    businessName: config.businessName,
    phoneNumberIdMasked: maskSecret(config.phoneNumberId),
    webhookPath: "/api/webhook/whatsapp",
  };
}

export async function getDeskData(): Promise<{
  status: ConnectionStatus;
  customers: Customer[];
  updates: StatusUpdate[];
}> {
  const [status, customers, updates] = await Promise.all([
    getConnectionStatus(),
    listCustomers(),
    listUpdates(),
  ]);
  return { status, customers, updates };
}

export async function getSettingsData() {
  const config = await getWhatsAppConfig();
  return {
    mode: isLiveConfig(config) ? "live" : "demo",
    businessName: config.businessName,
    phoneNumberId: config.phoneNumberId,
    verifyToken: config.verifyToken,
    accessTokenMasked: maskSecret(config.accessToken),
    accessTokenSet: Boolean(config.accessToken),
    webhookPath: "/api/webhook/whatsapp",
  } as const;
}
