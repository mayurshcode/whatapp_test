import { CheckCheck } from "lucide-react";

export function PhonePreview({
  body,
  customerName,
  phone,
}: {
  body: string;
  customerName: string;
  phone: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-[#0b141a] text-white shadow-xl">
      <div className="flex items-center gap-3 border-b border-white/10 bg-[#202c33] px-4 py-3">
        <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-semibold text-emerald-200">
          {(customerName.trim() || "C").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{customerName.trim() || "Customer"}</p>
          <p className="truncate font-mono text-[11px] text-white/55">
            {phone.trim() || "WhatsApp number"}
          </p>
        </div>
      </div>
      <div
        className="min-h-56 bg-[radial-gradient(circle_at_20%_20%,rgba(37,211,102,0.08),transparent_35%),linear-gradient(180deg,#0b141a,#111b21)] px-3 py-4"
      >
        <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-sm bg-[#005c4b] px-3 py-2 text-[13px] leading-5 shadow-sm">
          <p className="whitespace-pre-wrap">{body || "Your status update will appear here."}</p>
          <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-white/60">
            now
            <CheckCheck className="size-3 text-sky-300" />
          </p>
        </div>
      </div>
    </div>
  );
}
