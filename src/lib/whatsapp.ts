import { isLiveConfig } from "./config";
import type { WhatsAppConfig } from "./types";

export type SendResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
};

type GraphError = {
  error?: {
    message?: string;
  };
};

type GraphSuccess = {
  messages?: Array<{ id?: string }>;
};

export async function sendWhatsAppText(options: {
  config: WhatsAppConfig;
  to: string;
  body: string;
}): Promise<SendResult> {
  if (!isLiveConfig(options.config)) {
    return { ok: true, messageId: `demo_${crypto.randomUUID()}` };
  }

  const url = `https://graph.facebook.com/${options.config.graphVersion}/${options.config.phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: options.to,
        type: "text",
        text: {
          preview_url: false,
          body: options.body,
        },
      }),
    });

    const payload = (await response.json()) as GraphError & GraphSuccess;

    if (!response.ok) {
      return {
        ok: false,
        error: payload.error?.message || `WhatsApp API returned ${response.status}`,
      };
    }

    return {
      ok: true,
      messageId: payload.messages?.[0]?.id,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not reach WhatsApp",
    };
  }
}

export type IncomingWhatsAppMessage = {
  from: string;
  name: string;
  text: string;
  whatsappMessageId?: string;
};

type WebhookPayload = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: {
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: Array<{
          from?: string;
          id?: string;
          type?: string;
          text?: { body?: string };
        }>;
      };
    }>;
  }>;
};

export function parseIncomingMessages(payload: unknown): IncomingWhatsAppMessage[] {
  const body = payload as WebhookPayload;
  if (body.object !== "whatsapp_business_account") return [];

  const incoming: IncomingWhatsAppMessage[] = [];

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const names = new Map(
        (value?.contacts ?? []).map((contact) => [contact.wa_id ?? "", contact.profile?.name ?? ""]),
      );

      for (const message of value?.messages ?? []) {
        const text = message.text?.body?.trim();
        if (!text || !message.from) continue;
        incoming.push({
          from: message.from,
          name: names.get(message.from) || "",
          text,
          whatsappMessageId: message.id,
        });
      }
    }
  }

  return incoming;
}
