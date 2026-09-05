import { isHermesConfigured, isLoopbackHermesUrl, isVercelRuntime } from "./config";
import { toApiPhone } from "./phone";
import type { HermesBridgeStatus, WhatsAppConfig } from "./types";

export type SendResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
};

export type IncomingWhatsAppMessage = {
  from: string;
  name: string;
  text: string;
  whatsappMessageId?: string;
};

export type HermesHealth = {
  configured: boolean;
  connected: boolean;
  status: HermesBridgeStatus;
  detail?: string;
};

export type HermesPairing = {
  configured: boolean;
  status: HermesBridgeStatus;
  qr: string | null;
  userName: string | null;
  userId: string | null;
  detail?: string;
};

type HermesHealthPayload = {
  status?: string;
  queueLength?: number;
  error?: string;
};

type HermesSendPayload = {
  success?: boolean;
  messageId?: string;
  error?: string;
};

const HEALTH_TIMEOUT_MS = 5000;
const SEND_TIMEOUT_MS = 20000;
const POLL_TIMEOUT_MS = 8000;
const PAIR_TIMEOUT_MS = 5000;

export function toWhatsAppJid(phone: string): string {
  const digits = toApiPhone(phone);
  if (!digits) return "";
  if (digits.includes("@")) return digits;
  return `${digits}@s.whatsapp.net`;
}

export function phoneFromJid(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  const beforeAt = raw.includes("@") ? raw.slice(0, raw.indexOf("@")) : raw;
  const digits = beforeAt.replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

function hermesHeaders(config: WhatsAppConfig | undefined, extra?: HeadersInit): HeadersInit {
  const headers = new Headers(extra);
  if (config?.hermesBridgeToken && !headers.has("authorization")) {
    headers.set("Authorization", `Bearer ${config.hermesBridgeToken}`);
  }
  return headers;
}

async function fetchJson<T>(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  config?: WhatsAppConfig,
): Promise<{ ok: boolean; status: number; data: T | null; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      headers: hermesHeaders(config, init.headers),
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await response.text();
    let data: T | null = null;
    if (text) {
      try {
        data = JSON.parse(text) as T;
      } catch {
        data = null;
      }
    }
    return { ok: response.ok, status: response.status, data, text };
  } finally {
    clearTimeout(timer);
  }
}

export async function probeHermesHealth(config: WhatsAppConfig): Promise<HermesHealth> {
  if (!isHermesConfigured(config)) {
    return { configured: false, connected: false, status: "unconfigured" };
  }

  if (isVercelRuntime() && isLoopbackHermesUrl(config.hermesUrl)) {
    return {
      configured: true,
      connected: false,
      status: "unreachable",
      detail:
        "This Vercel deployment cannot reach 127.0.0.1. Run `npm run hermes` on an always-on machine, expose it with a public HTTPS URL, and set HERMES_WHATSAPP_URL to that URL.",
    };
  }

  try {
    const result = await fetchJson<HermesHealthPayload>(
      `${config.hermesUrl}/health`,
      { method: "GET" },
      HEALTH_TIMEOUT_MS,
      config,
    );

    if (!result.ok || !result.data) {
      return {
        configured: true,
        connected: false,
        status: "unreachable",
        detail: result.data?.error || result.text || `Hermes returned ${result.status}`,
      };
    }

    const raw = (result.data.status || "").toLowerCase();
    const status: HermesBridgeStatus =
      raw === "connected"
        ? "connected"
        : raw === "connecting"
          ? "connecting"
          : raw
            ? "disconnected"
            : "unreachable";

    return {
      configured: true,
      connected: status === "connected",
      status,
      detail: raw && status !== "connected" ? `Bridge status: ${raw}` : undefined,
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      status: "unreachable",
      detail:
        error instanceof Error
          ? error.name === "AbortError"
            ? "Hermes did not respond in time."
            : error.message
          : "Could not reach Hermes.",
    };
  }
}

type HermesQrPayload = {
  qr?: string | null;
  status?: string;
  user?: { id?: string | null; name?: string | null } | null;
};

export async function fetchHermesPairing(config: WhatsAppConfig): Promise<HermesPairing> {
  const health = await probeHermesHealth(config);
  if (!health.configured) {
    return { configured: false, status: "unconfigured", qr: null, userName: null, userId: null };
  }

  if (health.status === "unreachable") {
    return {
      configured: true,
      status: "unreachable",
      qr: null,
      userName: null,
      userId: null,
      detail: health.detail,
    };
  }

  try {
    const result = await fetchJson<HermesQrPayload>(
      `${config.hermesUrl}/qr`,
      { method: "GET" },
      PAIR_TIMEOUT_MS,
      config,
    );

    if (result.ok && result.data) {
      const raw = (result.data.status || health.status || "").toLowerCase();
      const status: HermesBridgeStatus =
        raw === "connected"
          ? "connected"
          : raw === "connecting"
            ? "connecting"
            : raw
              ? "disconnected"
              : health.status;

      return {
        configured: true,
        status,
        qr: typeof result.data.qr === "string" && result.data.qr.trim() ? result.data.qr : null,
        userName: result.data.user?.name || null,
        userId: result.data.user?.id || null,
      };
    }
  } catch {
    // Older Hermes bridges have no /qr; fall through to health-only pairing.
  }

  return {
    configured: true,
    status: health.status,
    qr: null,
    userName: null,
    userId: null,
    detail:
      health.status === "connected"
        ? undefined
        : "Bridge is up. Start `npm run hermes` so Relay can show a pairing QR.",
  };
}

export async function sendWhatsAppText(options: {
  config: WhatsAppConfig;
  to: string;
  body: string;
}): Promise<SendResult> {
  if (!isHermesConfigured(options.config)) {
    return { ok: true, messageId: `demo_${crypto.randomUUID()}` };
  }

  const chatId = toWhatsAppJid(options.to);
  if (!chatId) {
    return { ok: false, error: "Could not build a WhatsApp chat id from that number." };
  }

  try {
    const result = await fetchJson<HermesSendPayload>(
      `${options.config.hermesUrl}/send`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, message: options.body }),
      },
      SEND_TIMEOUT_MS,
      options.config,
    );

    if (!result.ok) {
      return {
        ok: false,
        error:
          result.data?.error ||
          result.text ||
          `Hermes rejected the send (${result.status}). Is the WhatsApp session paired?`,
      };
    }

    return {
      ok: true,
      messageId: result.data?.messageId || `hermes_${crypto.randomUUID()}`,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.name === "AbortError"
            ? "Hermes did not accept the send in time."
            : error.message
          : "Could not reach the Hermes WhatsApp bridge.",
    };
  }
}

export function parseHermesMessages(payload: unknown): IncomingWhatsAppMessage[] {
  const items = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object"
      ? [payload]
      : [];

  const incoming: IncomingWhatsAppMessage[] = [];

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;

    const chatId = stringField(record, ["chatId", "chat_id", "remoteJid"]);
    if (chatId.endsWith("@g.us") || chatId.includes("status@") || chatId.includes("broadcast")) {
      continue;
    }

    const sender = stringField(record, ["senderId", "senderNumber", "from", "sender", "chatId"]);
    const phone = phoneFromJid(sender || chatId);
    if (!phone) continue;

    const text =
      stringField(record, ["body", "message", "text", "caption"]) ||
      (record.hasMedia ? "[media]" : "");
    if (!text.trim()) continue;

    incoming.push({
      from: phone,
      name: stringField(record, ["senderName", "chatName", "name", "pushName"]),
      text: text.trim(),
      whatsappMessageId: stringField(record, ["messageId", "id"]) || undefined,
    });
  }

  return incoming;
}

export async function pollHermesMessages(config: WhatsAppConfig): Promise<IncomingWhatsAppMessage[]> {
  if (!isHermesConfigured(config)) return [];

  try {
    const result = await fetchJson<unknown>(
      `${config.hermesUrl}/messages`,
      { method: "GET" },
      POLL_TIMEOUT_MS,
      config,
    );
    if (!result.ok) return [];
    return parseHermesMessages(result.data);
  } catch {
    return [];
  }
}

function stringField(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (value && typeof value === "object" && "body" in value) {
      const nested = (value as { body?: unknown }).body;
      if (typeof nested === "string" && nested.trim()) return nested.trim();
    }
  }
  return "";
}
