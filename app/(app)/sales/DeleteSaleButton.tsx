"use client";

import { deleteSaleAction } from "@/lib/actions/sale";
import { useRef } from "react";

export function DeleteSaleButton({ saleId }: { saleId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={deleteSaleAction}>
      <input type="hidden" name="saleId" value={saleId} />
      <button
        type="button"
        className="text-xs text-red-500 hover:text-red-300 border border-red-900 rounded px-2 py-1 transition-colors"
        onClick={() => {
          if (confirm("Delete this sale? Stock will be restored.")) {
            formRef.current?.requestSubmit();
          }
        }}
      >
        Delete
      </button>
    </form>
  );
}
