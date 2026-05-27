"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function CreditConfirmDialog({
  open,
  action,
  estimatedCredits,
  remaining,
  reason,
  onConfirm,
  onCancel
}: {
  open: boolean;
  action: string;
  estimatedCredits: number;
  remaining: number;
  reason?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      open={open}
      eyebrow="Credit estimate"
      title={`This action will use about ${estimatedCredits} credits`}
      footer={
        <>
          <Button type="button" variant="secondary" fullWidth onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" fullWidth onClick={onConfirm}>
            Run
          </Button>
        </>
      }
    >
      <p className="text-sm text-steel">
        Action: <span className="font-medium text-graphite">{action}</span>
      </p>
      {reason ? <p className="mt-2 text-sm text-graphite">{reason}</p> : null}
      <p className="mt-3 text-sm text-steel">
        Available: <span className="font-semibold text-ink">{remaining.toLocaleString()}</span> credits
      </p>
    </Dialog>
  );
}
