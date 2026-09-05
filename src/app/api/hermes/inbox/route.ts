import { ingestHermesInbox } from "@/lib/inbox";

export const dynamic = "force-dynamic";

export async function GET() {
  const updates = await ingestHermesInbox();
  return Response.json(
    { received: updates.length, updates },
    { headers: { "Cache-Control": "no-store" } },
  );
}
