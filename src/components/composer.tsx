"use client";

import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPhoneDisplay } from "@/lib/phone";
import { STATUS_TEMPLATES } from "@/lib/templates";
import type { Customer, StatusId } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ComposerValues = {
  customerName: string;
  phone: string;
  reference: string;
  statusId: StatusId;
  note: string;
  customBody: string;
};

export function Composer({
  customers,
  values,
  onChange,
  onSubmit,
  sending,
  error,
}: {
  customers: Customer[];
  values: ComposerValues;
  onChange: (next: ComposerValues) => void;
  onSubmit: () => void;
  sending: boolean;
  error: string | null;
}) {
  function update<K extends keyof ComposerValues>(key: K, value: ComposerValues[K]) {
    onChange({ ...values, [key]: value });
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Send a status update</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a customer WhatsApp number, choose the status, and send the message.
        </p>
      </div>

      {customers.length > 0 ? (
        <div className="space-y-2">
          <Label>Recent customers</Label>
          <div className="flex flex-wrap gap-2">
            {customers.map((customer) => {
              const selected = values.phone === customer.phone;
              return (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...values,
                      customerName: customer.name,
                      phone: customer.phone,
                      reference: customer.lastReference,
                    })
                  }
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-left text-xs transition-colors",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-muted",
                  )}
                >
                  <span className="block font-medium">{customer.name}</span>
                  <span className={cn("font-mono", selected ? "opacity-80" : "text-muted-foreground")}>
                    {formatPhoneDisplay(customer.phone)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customerName">Customer name</Label>
          <Input
            id="customerName"
            placeholder="Priya Shah"
            value={values.customerName}
            onChange={(event) => update("customerName", event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">WhatsApp number</Label>
          <Input
            id="phone"
            inputMode="tel"
            placeholder="+1 415 555 0101"
            value={values.phone}
            onChange={(event) => update("phone", event.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reference">Order / reference</Label>
        <Input
          id="reference"
          placeholder="ORD-1842"
          value={values.reference}
          onChange={(event) => update("reference", event.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {STATUS_TEMPLATES.map((template) => {
            const selected = values.statusId === template.id;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => update("statusId", template.id)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left transition-colors",
                  selected
                    ? "border-primary bg-primary/15 ring-1 ring-primary"
                    : "border-border bg-card hover:bg-muted",
                )}
              >
                <span className="block text-sm font-medium">{template.label}</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">{template.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      {values.statusId === "custom" ? (
        <div className="space-y-2">
          <Label htmlFor="customBody">Custom message</Label>
          <Textarea
            id="customBody"
            rows={5}
            placeholder="Hi Priya, your table is ready."
            value={values.customBody}
            onChange={(event) => update("customBody", event.target.value)}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="note">Optional note</Label>
          <Textarea
            id="note"
            rows={3}
            placeholder="Courier is 20 minutes away."
            value={values.note}
            onChange={(event) => update("note", event.target.value)}
          />
        </div>
      )}

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={sending} className="w-full sm:w-auto">
        <Send data-icon="inline-start" />
        {sending ? "Sending…" : "Send to WhatsApp"}
      </Button>
    </form>
  );
}
