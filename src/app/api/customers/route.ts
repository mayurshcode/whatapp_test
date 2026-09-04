import { listCustomers } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const customers = await listCustomers();
  return Response.json(
    { customers },
    { headers: { "Cache-Control": "no-store" } },
  );
}
