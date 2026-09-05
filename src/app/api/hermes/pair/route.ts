import QRCode from "qrcode";

import { getWhatsAppConfig } from "@/lib/config";
import { fetchHermesPairing } from "@/lib/hermes";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getWhatsAppConfig();
  const pairing = await fetchHermesPairing(config);

  let qrDataUrl: string | null = null;
  if (pairing.qr) {
    try {
      qrDataUrl = await QRCode.toDataURL(pairing.qr, {
        width: 280,
        margin: 1,
        errorCorrectionLevel: "M",
      });
    } catch {
      qrDataUrl = null;
    }
  }

  return Response.json(
    {
      configured: pairing.configured,
      status: pairing.status,
      qr: pairing.qr,
      qrDataUrl,
      userName: pairing.userName,
      userId: pairing.userId,
      detail: pairing.detail ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
