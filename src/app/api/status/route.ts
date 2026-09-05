import { getConnectionStatus } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getConnectionStatus();
  return Response.json(status, { headers: { "Cache-Control": "no-store" } });
}
