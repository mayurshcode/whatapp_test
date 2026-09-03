import { getWhatsAppConfig, isLiveConfig, maskSecret, saveWhatsAppConfig } from "@/lib/config";

export async function GET() {
  const config = await getWhatsAppConfig();
  return Response.json({
    mode: isLiveConfig(config) ? "live" : "demo",
    businessName: config.businessName,
    phoneNumberId: config.phoneNumberId,
    verifyToken: config.verifyToken,
    accessTokenMasked: maskSecret(config.accessToken),
    accessTokenSet: Boolean(config.accessToken),
    webhookPath: "/api/webhook/whatsapp",
  });
}

export async function POST(request: Request) {
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

  return Response.json({
    mode: isLiveConfig(next) ? "live" : "demo",
    businessName: next.businessName,
    phoneNumberId: next.phoneNumberId,
    verifyToken: next.verifyToken,
    accessTokenMasked: maskSecret(next.accessToken),
    accessTokenSet: Boolean(next.accessToken),
    webhookPath: "/api/webhook/whatsapp",
  });
}
