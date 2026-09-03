import { getWhatsAppConfig, isLiveConfig } from "@/lib/config";
import { normalizePhone } from "@/lib/phone";
import { addUpdate, findCustomerByPhone, upsertCustomer } from "@/lib/store";
import type { StatusUpdate } from "@/lib/types";
import { parseIncomingMessages } from "@/lib/whatsapp";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const config = await getWhatsAppConfig();

  if (mode === "subscribe" && token === config.verifyToken && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return Response.json({ error: "Webhook verification failed." }, { status: 403 });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const incoming = parseIncomingMessages(payload);
  const config = await getWhatsAppConfig();
  const updates: StatusUpdate[] = [];

  for (const message of incoming) {
    const phone = normalizePhone(message.from.startsWith("+") ? message.from : `+${message.from}`);
    const existing = await findCustomerByPhone(phone);
    const customer = await upsertCustomer({
      name: message.name || existing?.name || "WhatsApp customer",
      phone,
      reference: existing?.lastReference || "",
      statusId: existing?.lastStatusId ?? null,
    });

    const update: StatusUpdate = {
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
      mode: isLiveConfig(config) ? "live" : "demo",
      whatsappMessageId: message.whatsappMessageId,
      createdAt: new Date().toISOString(),
    };

    updates.push(await addUpdate(update));
  }

  return Response.json({ received: updates.length });
}
