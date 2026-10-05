"use client";

import { useRouter } from "next/navigation";

export function CustomerSelect({
  customers,
  selected,
}: {
  customers: { id: string; name: string }[];
  selected?: string;
}) {
  const router = useRouter();

  return (
    <select
      value={selected ?? ""}
      onChange={(e) => {
        const id = e.target.value;
        // Switching customer resets the date range to their full history.
        router.push(id ? `/sales?tab=by-customer&customer=${id}` : "/sales?tab=by-customer");
      }}
      className="bg-[#111] border border-[#2A2A2A] text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-[#EAB308] w-full sm:w-72"
    >
      <option value="">Select customer…</option>
      {customers.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
