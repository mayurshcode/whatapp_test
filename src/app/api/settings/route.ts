import { getWhatsAppConfig, isLiveConfig, maskSecret, saveWhatsAppConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

function settingsResponse(config: Awaited<ReturnType<typeof getWhatsAppConfig>>) {
  return {
    mode: isLiveConfig(config) ? "live" : "demo",
    businessName: config.businessName,
    phoneNumberId: config.phoneNumberId,
    verifyToken: config.verifyToken,
    accessTokenMasked: maskSecret(config.accessToken),
    accessTokenSet: Boolean(config.accessToken),
    webhookPath: "/api/webhook/whatsapp",
  };
}

export async function GET() {
  const config = await getWhatsAppConfig();
  return Response.json(settingsResponse(config), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => null)) as {
      accessToken?: string;
      phoneNumberId?: string;
      verifyToken?: string;
      businessName?: string;
    } | null;

    if (!payload) {
      return Response.json({ error: "Send a JSON body." }, { status: 400 });
    }

    const next = await saveWhatsAppConfig({
      accessToken: payload.accessToken,
      phoneNumberId: payload.phoneNumberId,
      verifyToken: payload.verifyToken,
      businessName: payload.businessName,
    });

    return Response.json(settingsResponse(next), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save settings.";
    return Response.json({ error: message }, { status: 500 });
  }
}
