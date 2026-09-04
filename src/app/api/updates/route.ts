import { getWhatsAppConfig, isLiveConfig } from "@/lib/config";
import { isValidWhatsAppNumber, normalizePhone, toApiPhone } from "@/lib/phone";
import { addUpdate, listUpdates, upsertCustomer } from "@/lib/store";
import { buildStatusMessage, getStatusTemplate } from "@/lib/templates";
import type { StatusId, StatusUpdate } from "@/lib/types";
import { sendWhatsAppText } from "@/lib/whatsapp";

const STATUS_IDS: StatusId[] = [
  "confirmed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "ready_pickup",
  "delayed",
  "cancelled",
  "custom",
];

function isStatusId(value: unknown): value is StatusId {
  return typeof value === "string" && STATUS_IDS.includes(value as StatusId);
}

export const dynamic = "force-dynamic";

export async function GET() {
  const updates = await listUpdates();
  return Response.json(
    { updates },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as {
    customerName?: string;
    phone?: string;
    reference?: string;
    statusId?: string;
    note?: string;
    customBody?: string;
  } | null;

  if (!payload) {
    return Response.json({ error: "Send a JSON body." }, { status: 400 });
  }

  const customerName = payload.customerName?.trim() ?? "";
  const phone = normalizePhone(payload.phone ?? "");
  const reference = payload.reference?.trim() ?? "";
  const note = payload.note?.trim() ?? "";
  const customBody = payload.customBody?.trim() ?? "";

  if (!customerName) {
    return Response.json({ error: "Customer name is required." }, { status: 400 });
  }
  if (!isValidWhatsAppNumber(phone)) {
    return Response.json(
      { error: "Enter a WhatsApp number with country code, 10–15 digits." },
      { status: 400 },
    );
  }
  if (!reference) {
    return Response.json({ error: "Order or reference ID is required." }, { status: 400 });
  }
  if (!isStatusId(payload.statusId)) {
    return Response.json({ error: "Pick a status to send." }, { status: 400 });
  }
  if (payload.statusId === "custom" && !customBody) {
    return Response.json({ error: "Write the custom update before sending." }, { status: 400 });
  }

  const config = await getWhatsAppConfig();
  const mode = isLiveConfig(config) ? "live" : "demo";
  const template = getStatusTemplate(payload.statusId);
  const body = buildStatusMessage({
    customerName,
    reference,
    statusId: payload.statusId,
    note,
    customBody,
    businessName: config.businessName,
  });

  const customer = await upsertCustomer({
    name: customerName,
    phone,
    reference,
    statusId: payload.statusId,
  });

  const result = await sendWhatsAppText({
    config,
    to: toApiPhone(phone),
    body,
  });

  const update: StatusUpdate = {
    id: `upd_${crypto.randomUUID()}`,
    customerId: customer.id,
    customerName: customer.name,
    phone,
    reference,
    statusId: payload.statusId,
    statusLabel: template.label,
    body,
    note,
    direction: "outbound",
    state: result.ok ? "sent" : "failed",
    mode,
    whatsappMessageId: result.messageId,
    error: result.error,
    createdAt: new Date().toISOString(),
  };

  await addUpdate(update);

  if (!result.ok) {
    return Response.json({ error: result.error || "WhatsApp rejected the message.", update }, { status: 502 });
  }

  return Response.json({ update, mode });
}
