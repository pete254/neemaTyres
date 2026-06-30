"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DateRangeFilter({
  id,
  from,
  to,
}: {
  id: string;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);

  function apply() {
    const params = new URLSearchParams();
    if (f) params.set("from", f);
    if (t) params.set("to", t);
    router.push(`/customers/${id}?${params}`);
  }

  function clear() {
    setF("");
    setT("");
    router.push(`/customers/${id}`);
  }

  const inputClass =
    "bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#EAB308]";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-zinc-500">Period:</span>
      <input type="date" value={f} onChange={(e) => setF(e.target.value)} className={inputClass} />
      <span className="text-xs text-zinc-500">to</span>
      <input type="date" value={t} onChange={(e) => setT(e.target.value)} className={inputClass} />
      <button
        onClick={apply}
        className="px-3 py-1.5 rounded bg-[#EAB308] text-black text-xs font-semibold hover:bg-yellow-400 transition-colors"
      >
        Apply
      </button>
      {(from || to) && (
        <button
          onClick={clear}
          className="px-3 py-1.5 rounded border border-[#2A2A2A] text-zinc-400 text-xs hover:text-white transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}
