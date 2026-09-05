import { getWhatsAppConfig, isHermesConfigured, maskSecret, saveWhatsAppConfig } from "@/lib/config";
import { probeHermesHealth } from "@/lib/hermes";

export const dynamic = "force-dynamic";

async function settingsResponse(config: Awaited<ReturnType<typeof getWhatsAppConfig>>) {
  const health = await probeHermesHealth(config);
  return {
    mode: health.connected ? "live" : "demo",
    businessName: config.businessName,
    hermesUrl: config.hermesUrl,
    hermesWebhookSecretSet: Boolean(config.hermesWebhookSecret),
    hermesWebhookSecretMasked: maskSecret(config.hermesWebhookSecret),
    hermesStatus: health.status,
    hermesDetail: health.detail ?? null,
    webhookPath: "/api/webhook/hermes",
    configured: isHermesConfigured(config),
  };
}

export async function GET() {
  const config = await getWhatsAppConfig();
  return Response.json(await settingsResponse(config), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => null)) as {
      hermesUrl?: string;
      hermesWebhookSecret?: string;
      businessName?: string;
    } | null;

    if (!payload) {
      return Response.json({ error: "Send a JSON body." }, { status: 400 });
    }

    const next = await saveWhatsAppConfig({
      hermesUrl: payload.hermesUrl,
      hermesWebhookSecret: payload.hermesWebhookSecret,
      businessName: payload.businessName,
    });

    return Response.json(await settingsResponse(next), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save settings.";
    return Response.json({ error: message }, { status: 500 });
  }
}
