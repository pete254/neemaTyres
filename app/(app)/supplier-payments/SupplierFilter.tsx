"use client";

import { useRouter } from "next/navigation";

export function SupplierFilter({
  suppliers,
  value,
}: {
  suppliers: { id: string; name: string }[];
  value: string;
}) {
  const router = useRouter();
  return (
    <select
      value={value}
      onChange={(e) =>
        router.push(
          e.target.value
            ? `/supplier-payments/new?supplier=${e.target.value}`
            : "/supplier-payments/new"
        )
      }
      className="bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
    >
      <option value="">All suppliers (latest 200)</option>
      {suppliers.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
