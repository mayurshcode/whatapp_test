export type ConnectionMode = "demo" | "live";

export type UpdateDirection = "outbound" | "inbound";

export type DeliveryState = "queued" | "sent" | "failed" | "received";

export type StatusId =
  | "confirmed"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "ready_pickup"
  | "delayed"
  | "cancelled"
  | "custom";

export type Customer = {
  id: string;
  name: string;
  phone: string;
  lastReference: string;
  lastStatusId: StatusId | null;
  lastContactAt: string;
};

export type StatusUpdate = {
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  reference: string;
  statusId: StatusId;
  statusLabel: string;
  body: string;
  note: string;
  direction: UpdateDirection;
  state: DeliveryState;
  mode: ConnectionMode;
  whatsappMessageId?: string;
  error?: string;
  createdAt: string;
};

export type WhatsAppConfig = {
  accessToken: string;
  phoneNumberId: string;
  verifyToken: string;
  businessName: string;
  graphVersion: string;
};

export type AppStore = {
  customers: Customer[];
  updates: StatusUpdate[];
};

export type ConnectionStatus = {
  mode: ConnectionMode;
  configured: boolean;
  businessName: string;
  phoneNumberIdMasked: string | null;
  webhookPath: string;
};
