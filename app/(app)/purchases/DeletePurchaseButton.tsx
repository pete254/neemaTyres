"use client";

import { deletePurchaseAction } from "@/lib/actions/purchase";
import { useRef } from "react";

export function DeletePurchaseButton({ purchaseId }: { purchaseId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={deletePurchaseAction}>
      <input type="hidden" name="purchaseId" value={purchaseId} />
      <button
        type="button"
        className="text-xs text-red-500 hover:text-red-300 border border-red-900 rounded px-2 py-1 transition-colors"
        onClick={() => {
          if (confirm("Delete this purchase? Inventory and WAC will be reversed.")) {
            formRef.current?.requestSubmit();
          }
        }}
      >
        Delete
      </button>
    </form>
  );
}
