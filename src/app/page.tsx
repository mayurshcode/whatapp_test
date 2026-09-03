import { StatusDesk } from "@/components/status-desk";
import { getDeskData } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { status, customers, updates } = await getDeskData();
  return (
    <StatusDesk
      initialStatus={status}
      initialCustomers={customers}
      initialUpdates={updates}
    />
  );
}
