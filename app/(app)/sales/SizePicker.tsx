"use client";

import { useRouter } from "next/navigation";

const inputClass =
  "bg-[#111] border border-[#2A2A2A] text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-[#EAB308]";

export function SizePicker({
  buckets,
  selected,
  basePath = "/sales",
}: {
  buckets: string[];
  selected?: string;
  basePath?: string;
}) {
  const router = useRouter();

  return (
    <select
      value={selected ?? ""}
      onChange={(e) => {
        const b = e.target.value;
        // Changing size clears the current tyre selection (and any date filter).
        router.push(b ? `${basePath}?tab=by-type&bucket=${encodeURIComponent(b)}` : `${basePath}?tab=by-type`);
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
