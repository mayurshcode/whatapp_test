"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Settings } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ConnectionMode } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  mode,
}: {
  children: React.ReactNode;
  mode: ConnectionMode | null;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <MessageCircle className="size-4" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold tracking-tight">Relay</span>
              <span className="hidden text-xs text-muted-foreground sm:block">
                WhatsApp status updates
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {mode ? (
              <Badge variant={mode === "live" ? "default" : "secondary"} className="font-mono text-[11px]">
                {mode === "live" ? "Live Hermes" : "Demo mode"}
              </Badge>
            ) : null}
            <Button
              asChild
              variant={pathname === "/settings" ? "secondary" : "ghost"}
              size="sm"
            >
              <Link href="/settings">
                <Settings data-icon="inline-start" />
                Settings
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className={cn("mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8")}>
        {children}
      </main>
    </div>
  );
}
