"use client";

import { useState, useTransition } from "react";
import { removeSupplierPayment } from "@/lib/actions/supplierPayment";

export function DeletePaymentButton({
  paymentId,
  summary,
}: {
  paymentId: string;
  summary: string;
}) {
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border border-red-800 text-red-400 hover:bg-red-900/30 rounded px-6 py-2.5 text-sm transition-colors"
      >
        Delete Payment
      </button>
    );
  }

  return (
    <div className="border border-red-800 bg-red-950/30 rounded p-4 space-y-3 max-w-md">
      <p className="text-sm font-semibold text-red-300">Delete this payment?</p>
      <p className="text-sm text-zinc-300">{summary}</p>
      <ul className="text-xs text-zinc-400 list-disc pl-4 space-y-1">
        <li>The payment is removed permanently and cannot be undone.</li>
        <li>
          Its line on the supplier statement is removed too, so the amount
          owed to this supplier goes <span className="text-zinc-200">up</span>{" "}
          by the payment amount.
        </li>
        <li>
          Any statement PDFs already shared will no longer match. If the
          details are just wrong, edit the payment instead.
        </li>
        <li>The deletion is recorded in the audit log.</li>
      </ul>
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
        />
        I understand, delete this payment
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          disabled={!agreed || pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                await removeSupplierPayment(paymentId);
              } catch (err) {
                // redirect() on success surfaces as a thrown NEXT_REDIRECT; let it through.
                if ((err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw err;
                setError((err as Error).message || "Delete failed");
              }
            })
          }
          className="bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded px-4 py-2 text-sm transition-colors"
        >
          {pending ? "Deleting…" : "Delete permanently"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setAgreed(false);
            setError(null);
          }}
          className="border border-[#2A2A2A] text-zinc-300 hover:text-white rounded px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
