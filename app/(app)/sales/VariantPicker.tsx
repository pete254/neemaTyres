"use client";

import { useRouter } from "next/navigation";

interface Option {
  id: string;
  label: string;
  qtyOnHand: number;
}

export function VariantPicker({
  variants,
  selected,
}: {
  variants: Option[];
  selected?: string;
}) {
  const router = useRouter();

  return (
    <select
      value={selected ?? ""}
      onChange={(e) => {
        const id = e.target.value;
        router.push(id ? `/sales?tab=by-type&variant=${id}` : "/sales?tab=by-type");
      }}
      className="w-full max-w-md bg-[#111] border border-[#2A2A2A] text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-[#EAB308]"
    >
      <option value="">Select a tyre type…</option>
      {variants.map((v) => (
        <option key={v.id} value={v.id}>
          {v.label} — {v.qtyOnHand} in stock
        </option>
      ))}
    </select>
  );
}
