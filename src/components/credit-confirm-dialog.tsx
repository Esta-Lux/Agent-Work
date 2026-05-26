"use client";

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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wider text-signal">Credit estimate</p>
        <h3 className="mt-2 text-lg font-semibold text-ink">This action will use about {estimatedCredits} credits</h3>
        <p className="mt-2 text-sm text-steel">
          Action: <span className="font-medium text-graphite">{action}</span>
        </p>
        {reason ? <p className="mt-2 text-sm text-graphite">{reason}</p> : null}
        <p className="mt-3 text-sm text-steel">
          Available: <span className="font-semibold text-ink">{remaining.toLocaleString()}</span> credits
        </p>
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-line px-4 py-2 text-sm font-semibold text-graphite"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-signal px-4 py-2 text-sm font-semibold text-white"
          >
            Run
          </button>
        </div>
      </div>
    </div>
  );
}
