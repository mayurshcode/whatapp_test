"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, MessageSquareReply } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatPhoneDisplay } from "@/lib/phone";
import type { StatusUpdate } from "@/lib/types";

function formatWhen(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function ActivityFeed({
  updates,
  loading,
  error,
  onRetry,
  onSimulateReply,
}: {
  updates: StatusUpdate[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSimulateReply: (update: StatusUpdate, text: string) => Promise<void>;
}) {
  const [target, setTarget] = useState<StatusUpdate | null>(null);
  const [reply, setReply] = useState("Thanks — when will this arrive?");
  const [sending, setSending] = useState(false);

  async function submitReply() {
    if (!target || !reply.trim()) return;
    setSending(true);
    try {
      await onSimulateReply(target, reply.trim());
      setTarget(null);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Activity</h2>
          <p className="text-xs text-muted-foreground">
            Status updates you sent and replies from customers.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
          <p>{error}</p>
          <Button className="mt-2" size="sm" variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}

      {!loading && !error && updates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm font-medium">No updates yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Send a status update to a customer WhatsApp number to see it here.
          </p>
        </div>
      ) : null}

      <ol className="space-y-3">
        {updates.map((update) => (
          <li
            key={update.id}
            className="rounded-xl border border-border bg-card px-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={update.direction === "inbound" ? "secondary" : "default"}>
                {update.direction === "inbound" ? (
                  <ArrowDownLeft className="size-3" />
                ) : (
                  <ArrowUpRight className="size-3" />
                )}
                {update.direction === "inbound" ? "Reply" : update.statusLabel}
              </Badge>
              <Badge variant="outline">{update.state}</Badge>
              {update.mode === "demo" ? <Badge variant="outline">demo</Badge> : null}
              <span className="ml-auto text-xs text-muted-foreground">{formatWhen(update.createdAt)}</span>
            </div>
            <p className="mt-2 text-sm font-medium">
              {update.customerName}
              <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                {formatPhoneDisplay(update.phone)}
              </span>
            </p>
            {update.reference ? (
              <p className="font-mono text-xs text-muted-foreground">{update.reference}</p>
            ) : null}
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground/90">{update.body}</p>
            {update.error ? (
              <p className="mt-2 text-xs text-destructive">{update.error}</p>
            ) : null}
            {update.direction === "outbound" ? (
              <Button
                className="mt-3"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setTarget(update);
                  setReply("Thanks — when will this arrive?");
                }}
              >
                <MessageSquareReply data-icon="inline-start" />
                Simulate reply
              </Button>
            ) : null}
          </li>
        ))}
      </ol>

      <Dialog open={Boolean(target)} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Simulate a customer reply</DialogTitle>
            <DialogDescription>
              Demo mode can pretend {target?.customerName} replied on WhatsApp so you can see inbound messages.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reply">Reply text</Label>
            <Textarea
              id="reply"
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button disabled={sending || !reply.trim()} onClick={() => void submitReply()}>
              {sending ? "Adding…" : "Add reply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
