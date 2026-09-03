import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { WhatsAppConfig } from "./types";

const CONFIG_PATH = path.join(process.cwd(), ".data", "config.json");

type StoredConfig = Partial<WhatsAppConfig>;

async function readStoredConfig(): Promise<StoredConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    return JSON.parse(raw) as StoredConfig;
  } catch {
    return {};
  }
}

export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  const stored = await readStoredConfig();
  return {
    accessToken:
      process.env.WHATSAPP_ACCESS_TOKEN?.trim() || stored.accessToken?.trim() || "",
    phoneNumberId:
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ||
      stored.phoneNumberId?.trim() ||
      "",
    verifyToken:
      process.env.WHATSAPP_VERIFY_TOKEN?.trim() || stored.verifyToken?.trim() || "relay-demo-verify",
    businessName:
      process.env.WHATSAPP_BUSINESS_NAME?.trim() ||
      stored.businessName?.trim() ||
      "Northside Market",
    graphVersion: process.env.WHATSAPP_GRAPH_VERSION?.trim() || stored.graphVersion || "v21.0",
  };
}

export function isLiveConfig(config: WhatsAppConfig): boolean {
  return Boolean(config.accessToken && config.phoneNumberId);
}

export async function saveWhatsAppConfig(next: StoredConfig): Promise<WhatsAppConfig> {
  const current = await readStoredConfig();
  const merged: StoredConfig = {
    ...current,
    ...Object.fromEntries(
      Object.entries(next).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]),
    ),
  };

  await mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(merged, null, 2), "utf8");
  return getWhatsAppConfig();
}

export function maskSecret(value: string): string | null {
  if (!value) return null;
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}
