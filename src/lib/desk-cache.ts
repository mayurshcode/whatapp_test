import type { Customer, StatusUpdate } from "./types";

const CACHE_KEY = "relay-desk-v1";
const CACHE_EVENT = "relay-desk-cache";

type DeskCache = {
  customers: Customer[];
  updates: StatusUpdate[];
};

export function mergeById<T extends { id: string; createdAt?: string }>(
  ...lists: T[][]
): T[] {
  const map = new Map<string, T>();
  for (const list of lists) {
    for (const item of list) {
      const previous = map.get(item.id);
      if (!previous) {
        map.set(item.id, item);
        continue;
      }
      if ((item.createdAt ?? "") > (previous.createdAt ?? "")) {
        map.set(item.id, item);
      }
    }
  }
  return [...map.values()]
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, 200);
}

export function mergeCustomers(...lists: Customer[][]): Customer[] {
  const map = new Map<string, Customer>();
  for (const list of lists) {
    for (const customer of list) {
      const key = customer.phone.replace(/\D/g, "") || customer.id;
      const previous = map.get(key);
      if (!previous) {
        map.set(key, customer);
        continue;
      }
      if (customer.lastContactAt > previous.lastContactAt) {
        map.set(key, customer);
      }
    }
  }
  return [...map.values()].sort((a, b) => b.lastContactAt.localeCompare(a.lastContactAt));
}

export function readDeskCache(): DeskCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeskCache;
    if (!Array.isArray(parsed.customers) || !Array.isArray(parsed.updates)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeDeskCache(cache: DeskCache): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  window.dispatchEvent(new Event(CACHE_EVENT));
}

export function subscribeDeskCache(onStoreChange: () => void): () => void {
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(CACHE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(CACHE_EVENT, handler);
  };
}

export function getDeskCacheSnapshot(): string {
  return window.localStorage.getItem(CACHE_KEY) ?? "";
}
