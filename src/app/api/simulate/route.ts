import { getWhatsAppConfig, isHermesConfigured } from "@/lib/config";
import { isValidWhatsAppNumber, normalizePhone } from "@/lib/phone";
import { addUpdate, findCustomerByPhone, upsertCustomer } from "@/lib/store";
import type { StatusUpdate } from "@/lib/types";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as {
    phone?: string;
    text?: string;
    customerName?: string;
    reference?: string;
  } | null;

  const phone = normalizePhone(payload?.phone ?? "");
  const text = payload?.text?.trim() ?? "";

  if (!isValidWhatsAppNumber(phone)) {
    return Response.json({ error: "A valid WhatsApp number is required." }, { status: 400 });
  }
  if (!text) {
    return Response.json({ error: "Write the customer reply to simulate." }, { status: 400 });
  }

  const existing = await findCustomerByPhone(phone);
  const customer = await upsertCustomer({
    name: payload?.customerName?.trim() || existing?.name || "Customer",
    phone,
    reference: payload?.reference?.trim() || existing?.lastReference || "",
    statusId: existing?.lastStatusId ?? null,
  });

  const config = await getWhatsAppConfig();
  const update: StatusUpdate = {
    id: `upd_${crypto.randomUUID()}`,
    customerId: customer.id,
    customerName: customer.name,
    phone,
    reference: customer.lastReference,
    statusId: "custom",
    statusLabel: "Customer reply",
    body: text,
    note: "",
    direction: "inbound",
    state: "received",
    mode: isHermesConfigured(config) ? "live" : "demo",
    createdAt: new Date().toISOString(),
  };

  await addUpdate(update);
  return Response.json({ update });
}
