import { ingestHermesPayload } from "@/lib/inbox";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      error: "Relay no longer uses the WhatsApp Cloud API. POST inbound events to /api/webhook/hermes.",
    },
    { status: 410 },
  );
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (payload == null) {
    return Response.json(
      { error: "POST inbound events to /api/webhook/hermes." },
      { status: 410 },
    );
  }

  const updates = await ingestHermesPayload(payload);
  return Response.json({ received: updates.length, updates });
}
