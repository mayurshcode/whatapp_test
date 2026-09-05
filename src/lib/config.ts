import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { WhatsAppConfig } from "./types";

const DATA_CONFIG = path.join(process.cwd(), ".data", "config.json");
const TMP_CONFIG = path.join("/tmp", "relay-config.json");

type StoredConfig = Partial<WhatsAppConfig>;

type GlobalRelay = typeof globalThis & { __relayConfig?: StoredConfig };

const g = globalThis as GlobalRelay;

async function readFrom(filePath: string): Promise<StoredConfig | null> {
  try {
    const raw = await readFile(/* turbopackIgnore: true */ filePath, "utf8");
    const parsed = JSON.parse(raw) as StoredConfig;
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // Missing or unreadable at this path.
  }
  return null;
}

async function readStoredConfig(): Promise<StoredConfig> {
  if (g.__relayConfig) return g.__relayConfig;
  const persisted = (await readFrom(DATA_CONFIG)) ?? (await readFrom(TMP_CONFIG));
  if (persisted) {
    g.__relayConfig = persisted;
    return persisted;
  }
  return {};
}

async function persist(stored: StoredConfig): Promise<void> {
  g.__relayConfig = stored;
  const payload = JSON.stringify(stored, null, 2);

  async function writeTo(filePath: string) {
    try {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(/* turbopackIgnore: true */ filePath, payload, "utf8");
    } catch {
      // File persistence is best-effort; memory still holds the latest config.
    }
  }

  await Promise.all([writeTo(DATA_CONFIG), writeTo(TMP_CONFIG)]);
}

export function normalizeHermesUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  const stored = await readStoredConfig();
  return {
    hermesUrl: normalizeHermesUrl(
      process.env.HERMES_WHATSAPP_URL?.trim() || stored.hermesUrl || "",
    ),
    hermesWebhookSecret:
      process.env.HERMES_WEBHOOK_SECRET?.trim() || stored.hermesWebhookSecret?.trim() || "",
    businessName:
      process.env.WHATSAPP_BUSINESS_NAME?.trim() ||
      stored.businessName?.trim() ||
      "Northside Market",
  };
}

export function isHermesConfigured(config: WhatsAppConfig): boolean {
  return Boolean(config.hermesUrl);
}

export async function saveWhatsAppConfig(next: StoredConfig): Promise<WhatsAppConfig> {
  const current = await readStoredConfig();
  const merged: StoredConfig = { ...current };

  for (const [key, value] of Object.entries(next) as [keyof StoredConfig, unknown][]) {
    if (typeof value !== "string") continue;
    if (key === "hermesUrl") {
      merged.hermesUrl = normalizeHermesUrl(value);
      continue;
    }
    merged[key] = value.trim();
  }

  await persist(merged);
  return getWhatsAppConfig();
}

export function maskSecret(value: string): string | null {
  if (!value) return null;
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}
