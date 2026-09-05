import { getWhatsAppConfig, isHermesConfigured } from "./config";
import { parseHermesMessages, pollHermesMessages, type IncomingWhatsAppMessage } from "./hermes";
import { normalizePhone } from "./phone";
import { addUpdate, findCustomerByPhone, findUpdateByWhatsAppId, upsertCustomer } from "./store";
import type { StatusUpdate } from "./types";

type GlobalInbox = typeof globalThis & { __relayInboxChain?: Promise<unknown> };

const g = globalThis as GlobalInbox;

export async function recordIncomingMessages(
  incoming: IncomingWhatsAppMessage[],
  mode: "demo" | "live",
): Promise<StatusUpdate[]> {
  const recorded: StatusUpdate[] = [];

  for (const message of incoming) {
    if (message.whatsappMessageId) {
      const existing = await findUpdateByWhatsAppId(message.whatsappMessageId);
      if (existing) continue;
    }

    const phone = normalizePhone(message.from.startsWith("+") ? message.from : `+${message.from}`);
    const known = await findCustomerByPhone(phone);
    const customer = await upsertCustomer({
      name: message.name || known?.name || "WhatsApp customer",
      phone,
      reference: known?.lastReference || "",
      statusId: known?.lastStatusId ?? null,
    });

    recorded.push(
      await addUpdate({
        id: `upd_${crypto.randomUUID()}`,
        customerId: customer.id,
        customerName: customer.name,
        phone,
        reference: customer.lastReference,
        statusId: "custom",
        statusLabel: "Customer reply",
        body: message.text,
        note: "",
        direction: "inbound",
        state: "received",
        mode,
        whatsappMessageId: message.whatsappMessageId,
        createdAt: new Date().toISOString(),
      }),
    );
  }

  return recorded;
}

async function pullHermesInbox(): Promise<StatusUpdate[]> {
  const config = await getWhatsAppConfig();
  if (!isHermesConfigured(config)) return [];
  const incoming = await pollHermesMessages(config);
  return recordIncomingMessages(incoming, "live");
}

export async function ingestHermesInbox(): Promise<StatusUpdate[]> {
  const run = (g.__relayInboxChain ?? Promise.resolve()).then(pullHermesInbox, pullHermesInbox);
  g.__relayInboxChain = run.catch(() => []);
  return run;
}

export async function ingestHermesPayload(payload: unknown): Promise<StatusUpdate[]> {
  const incoming = parseHermesMessages(payload);
  if (!incoming.length) return [];
  const config = await getWhatsAppConfig();
  return recordIncomingMessages(incoming, isHermesConfigured(config) ? "live" : "demo");
}
