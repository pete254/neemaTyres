"use client";

import { useRouter } from "next/navigation";

const inputClass =
  "bg-[#111] border border-[#2A2A2A] text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-[#EAB308]";

export function SizePicker({
  buckets,
  selected,
}: {
  buckets: string[];
  selected?: string;
}) {
  const router = useRouter();

  return (
    <select
      value={selected ?? ""}
      onChange={(e) => {
        const b = e.target.value;
        // Changing size clears the current tyre selection.
        router.push(b ? `/sales?tab=by-type&bucket=${encodeURIComponent(b)}` : "/sales?tab=by-type");
      }}
      className={`${inputClass} w-full sm:w-56`}
    >
      <option value="">Select size…</option>
      {buckets.map((b) => (
        <option key={b} value={b}>
          {b}&quot;
        </option>
      ))}
    </select>
  );
}
