import type { StatusId } from "./types";

export type StatusTemplate = {
  id: StatusId;
  label: string;
  hint: string;
  phrase: string;
};

export const STATUS_TEMPLATES: StatusTemplate[] = [
  {
    id: "confirmed",
    label: "Order confirmed",
    hint: "We received the order",
    phrase: "confirmed and is being prepared",
  },
  {
    id: "packed",
    label: "Packed",
    hint: "Ready to leave the warehouse",
    phrase: "packed and ready to ship",
  },
  {
    id: "shipped",
    label: "Shipped",
    hint: "Handed to the carrier",
    phrase: "on its way",
  },
  {
    id: "out_for_delivery",
    label: "Out for delivery",
    hint: "Arriving today",
    phrase: "out for delivery today",
  },
  {
    id: "delivered",
    label: "Delivered",
    hint: "Customer has the order",
    phrase: "delivered",
  },
  {
    id: "ready_pickup",
    label: "Ready for pickup",
    hint: "Waiting at the counter",
    phrase: "ready for pickup",
  },
  {
    id: "delayed",
    label: "Delayed",
    hint: "Needs a new ETA",
    phrase: "delayed",
  },
  {
    id: "cancelled",
    label: "Cancelled",
    hint: "Order will not ship",
    phrase: "cancelled",
  },
  {
    id: "custom",
    label: "Custom update",
    hint: "Write your own message",
    phrase: "",
  },
];

export function getStatusTemplate(id: StatusId): StatusTemplate {
  return STATUS_TEMPLATES.find((template) => template.id === id) ?? STATUS_TEMPLATES[0];
}

export function buildStatusMessage(input: {
  customerName: string;
  reference: string;
  statusId: StatusId;
  note?: string;
  customBody?: string;
  businessName: string;
}): string {
  const name = input.customerName.trim() || "there";
  const reference = input.reference.trim() || "your order";
  const business = input.businessName.trim() || "your store";
  const note = input.note?.trim();

  if (input.statusId === "custom") {
    const custom = input.customBody?.trim();
    if (custom) return custom;
    return `Hi ${name},\n\nWe have an update on ${reference}.\n\n— ${business}`;
  }

  const template = getStatusTemplate(input.statusId);
  const lines = [
    `Hi ${name},`,
    "",
    `Your order ${reference} is ${template.phrase}.`,
  ];

  if (note) {
    lines.push("", note);
  }

  lines.push("", `— ${business}`);
  return lines.join("\n");
}
