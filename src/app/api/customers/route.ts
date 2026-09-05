import { ingestHermesInbox } from "@/lib/inbox";
import { listCustomers } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  await ingestHermesInbox();
  const customers = await listCustomers();
  return Response.json(
    { customers },
    { headers: { "Cache-Control": "no-store" } },
  );
}
