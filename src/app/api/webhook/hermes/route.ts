import { getWhatsAppConfig } from "@/lib/config";
import { ingestHermesPayload } from "@/lib/inbox";

export const dynamic = "force-dynamic";

function readProvidedSecret(request: Request): string {
  const bearer = request.headers.get("authorization");
  if (bearer?.toLowerCase().startsWith("bearer ")) {
    return bearer.slice(7).trim();
  }
  return (
    request.headers.get("x-hermes-secret") ||
    request.headers.get("x-webhook-secret") ||
    ""
  ).trim();
}

export async function GET() {
  return Response.json({
    ok: true,
    path: "/api/webhook/hermes",
    hint: "POST inbound Hermes WhatsApp events here as JSON.",
  });
}

export async function POST(request: Request) {
  const config = await getWhatsAppConfig();
  if (config.hermesWebhookSecret) {
    const provided = readProvidedSecret(request);
    if (provided !== config.hermesWebhookSecret) {
      return Response.json({ error: "Invalid Hermes webhook secret." }, { status: 401 });
    }
  }

  const payload = await request.json().catch(() => null);
  if (payload == null) {
    return Response.json({ error: "Send a JSON body." }, { status: 400 });
  }

  const updates = await ingestHermesPayload(payload);
  return Response.json({ received: updates.length, updates });
}
