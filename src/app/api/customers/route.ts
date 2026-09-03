import { listCustomers } from "@/lib/store";

export async function GET() {
  const customers = await listCustomers();
  return Response.json({ customers });
}
