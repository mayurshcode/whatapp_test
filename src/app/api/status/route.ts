import { getWhatsAppConfig, isLiveConfig, maskSecret } from "@/lib/config";

export async function GET() {
  const config = await getWhatsAppConfig();
  const live = isLiveConfig(config);

  return Response.json({
    mode: live ? "live" : "demo",
    configured: live,
    businessName: config.businessName,
    phoneNumberIdMasked: maskSecret(config.phoneNumberId),
    webhookPath: "/api/webhook/whatsapp",
  });
}
