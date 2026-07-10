"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PurchaseTxnFilter({
  bucket,
  variantId,
  fromStr,
  toStr,
  today,
}: {
  bucket: string;
  variantId: string;
  fromStr: string;
  toStr: string;
  today: string;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(fromStr);
  const [to, setTo] = useState(toStr);

  const build = (f: string, t: string) => {
    const p = new URLSearchParams({ tab: "by-type", bucket, variant: variantId });
    if (f) p.set("from", f);
    if (t) p.set("to", t);
    return `/purchases?${p.toString()}`;
  };

  const inputCls =
    "bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]";
  const active = Boolean(fromStr || toStr);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(build(from, to));
      }}
      className="flex gap-3 items-end flex-wrap"
    >
      <div>
        <label className="block text-xs text-zinc-400 mb-1">From</label>
        <input type="date" value={from} max={today} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1">To</label>
        <input type="date" value={to} max={today} onChange={(e) => setTo(e.target.value)} className={inputCls} />
      </div>
      <button
        type="submit"
        className="bg-[#EAB308] hover:bg-[#CA8A04] text-black font-semibold rounded px-4 py-2 text-sm transition-colors"
      >
        Apply
      </button>
      {active && (
        <Link
          href={build("", "")}
          onClick={() => {
            setFrom("");
            setTo("");
          }}
          className="text-sm text-zinc-400 hover:text-white border border-[#2A2A2A] rounded px-3 py-2 transition-colors"
        >
          Clear · show all
        </Link>
      )}
    </form>
  );
}
