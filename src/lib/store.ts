import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getStatusTemplate } from "./templates";
import type { AppStore, Customer, StatusId, StatusUpdate } from "./types";

const DATA_STORE = path.join(process.cwd(), ".data", "store.json");
const TMP_STORE = path.join("/tmp", "relay-store.json");

type GlobalRelay = typeof globalThis & { __relayStore?: AppStore };

const g = globalThis as GlobalRelay;

function nowIso(offsetMs = 0): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

function seedStore(): AppStore {
  const customers: Customer[] = [
    {
      id: "cus_priya",
      name: "Priya Shah",
      phone: "+14155550101",
      lastReference: "ORD-1842",
      lastStatusId: "shipped",
      lastContactAt: nowIso(-2 * 60 * 60 * 1000),
    },
    {
      id: "cus_jordan",
      name: "Jordan Hale",
      phone: "+14155550102",
      lastReference: "ORD-1847",
      lastStatusId: "out_for_delivery",
      lastContactAt: nowIso(-40 * 60 * 60 * 1000),
    },
    {
      id: "cus_mei",
      name: "Mei Lin",
      phone: "+14155550103",
      lastReference: "APT-220",
      lastStatusId: "confirmed",
      lastContactAt: nowIso(-22 * 60 * 60 * 1000),
    },
  ];

  const updates: StatusUpdate[] = [
    {
      id: "upd_mei",
      customerId: "cus_mei",
      customerName: "Mei Lin",
      phone: "+14155550103",
      reference: "APT-220",
      statusId: "confirmed",
      statusLabel: getStatusTemplate("confirmed").label,
      body: "Hi Mei,\n\nYour order APT-220 is confirmed and is being prepared.\n\nSee you tomorrow at 10:30 AM.\n\n— Northside Market",
      note: "See you tomorrow at 10:30 AM.",
      direction: "outbound",
      state: "sent",
      mode: "demo",
      createdAt: nowIso(-22 * 60 * 60 * 1000),
    },
    {
      id: "upd_priya_out",
      customerId: "cus_priya",
      customerName: "Priya Shah",
      phone: "+14155550101",
      reference: "ORD-1842",
      statusId: "shipped",
      statusLabel: getStatusTemplate("shipped").label,
      body: "Hi Priya,\n\nYour order ORD-1842 is on its way.\n\nWe'll text you again when it's out for delivery.\n\n— Northside Market",
      note: "We'll text you again when it's out for delivery.",
      direction: "outbound",
      state: "sent",
      mode: "demo",
      createdAt: nowIso(-2 * 60 * 60 * 1000),
    },
    {
      id: "upd_priya_in",
      customerId: "cus_priya",
      customerName: "Priya Shah",
      phone: "+14155550101",
      reference: "ORD-1842",
      statusId: "custom",
      statusLabel: "Customer reply",
      body: "Thanks! When should it arrive?",
      note: "",
      direction: "inbound",
      state: "received",
      mode: "demo",
      createdAt: nowIso(-90 * 60 * 1000),
    },
    {
      id: "upd_jordan",
      customerId: "cus_jordan",
      customerName: "Jordan Hale",
      phone: "+14155550102",
      reference: "ORD-1847",
      statusId: "out_for_delivery",
      statusLabel: getStatusTemplate("out_for_delivery").label,
      body: "Hi Jordan,\n\nYour order ORD-1847 is out for delivery today.\n\nThe courier is in your area.\n\n— Northside Market",
      note: "The courier is in your area.",
      direction: "outbound",
      state: "sent",
      mode: "demo",
      createdAt: nowIso(-40 * 60 * 60 * 1000),
    },
  ];

  return { customers, updates };
}

async function persist(store: AppStore): Promise<void> {
  g.__relayStore = store;
  const payload = JSON.stringify(store, null, 2);

  async function writeTo(filePath: string) {
    try {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(/* turbopackIgnore: true */ filePath, payload, "utf8");
    } catch {
      // File persistence is best-effort; memory still holds the latest feed.
    }
  }

  await Promise.all([writeTo(DATA_STORE), writeTo(TMP_STORE)]);
}

async function readFrom(filePath: string): Promise<AppStore | null> {
  try {
    const raw = await readFile(/* turbopackIgnore: true */ filePath, "utf8");
    const parsed = JSON.parse(raw) as AppStore;
    if (Array.isArray(parsed.customers) && Array.isArray(parsed.updates)) {
      return parsed;
    }
  } catch {
    // Missing or unreadable at this path.
  }
  return null;
}

async function readPersisted(): Promise<AppStore | null> {
  return (await readFrom(DATA_STORE)) ?? (await readFrom(TMP_STORE));
}

export async function getStore(): Promise<AppStore> {
  if (g.__relayStore) return g.__relayStore;

  const persisted = await readPersisted();
  if (persisted) {
    g.__relayStore = persisted;
    return persisted;
  }

  const seeded = seedStore();
  await persist(seeded);
  return seeded;
}

export async function upsertCustomer(input: {
  name: string;
  phone: string;
  reference: string;
  statusId: StatusId | null;
}): Promise<Customer> {
  const store = await getStore();
  const existing = store.customers.find((customer) => customer.phone === input.phone);
  const customer: Customer = existing
    ? {
        ...existing,
        name: input.name || existing.name,
        lastReference: input.reference || existing.lastReference,
        lastStatusId: input.statusId ?? existing.lastStatusId,
        lastContactAt: nowIso(),
      }
    : {
        id: `cus_${crypto.randomUUID()}`,
        name: input.name,
        phone: input.phone,
        lastReference: input.reference,
        lastStatusId: input.statusId,
        lastContactAt: nowIso(),
      };

  store.customers = [
    customer,
    ...store.customers.filter((item) => item.id !== customer.id),
  ].sort((a, b) => b.lastContactAt.localeCompare(a.lastContactAt));

  await persist(store);
  return customer;
}

export async function addUpdate(update: StatusUpdate): Promise<StatusUpdate> {
  const store = await getStore();
  store.updates = [update, ...store.updates].slice(0, 200);
  await persist(store);
  return update;
}

export async function listUpdates(): Promise<StatusUpdate[]> {
  const store = await getStore();
  return [...store.updates].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listCustomers(): Promise<Customer[]> {
  const store = await getStore();
  return [...store.customers].sort((a, b) => b.lastContactAt.localeCompare(a.lastContactAt));
}

export async function findCustomerByPhone(phone: string): Promise<Customer | undefined> {
  const store = await getStore();
  return store.customers.find((customer) => customer.phone.replace(/\D/g, "") === phone.replace(/\D/g, ""));
}
