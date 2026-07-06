"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Option {
  id: string;
  label: string;
  sizeBucket: string;
  qtyOnHand: number;
}

const inputClass =
  "bg-[#111] border border-[#2A2A2A] text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-[#EAB308]";

export function VariantPicker({
  variants,
  selected,
}: {
  variants: Option[];
  selected?: string;
}) {
  const router = useRouter();

  // Initialise the size bucket from the currently-selected variant, if any.
  const selectedVariant = variants.find((v) => v.id === selected);
  const [bucket, setBucket] = useState(selectedVariant?.sizeBucket ?? "");

  // Distinct buckets (already recency-ordered variants -> stable bucket set).
  const buckets = Array.from(new Set(variants.map((v) => v.sizeBucket))).sort();

  // Tyres in the chosen bucket, preserving the recency order from the server.
  const bucketVariants = bucket
    ? variants.filter((v) => v.sizeBucket === bucket)
    : [];

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Step 1: size bucket */}
      <select
        value={bucket}
        onChange={(e) => {
          setBucket(e.target.value);
          // Clear the current variant when the bucket changes.
          router.push("/sales?tab=by-type");
        }}
        className={`${inputClass} w-full sm:w-40`}
      >
        <option value="">Size…</option>
        {buckets.map((b) => (
          <option key={b} value={b}>
            {b}&quot;
          </option>
        ))}
      </select>

      {/* Step 2: tyre type */}
      <select
        value={selected ?? ""}
        disabled={!bucket}
        onChange={(e) => {
          const id = e.target.value;
          router.push(id ? `/sales?tab=by-type&variant=${id}` : "/sales?tab=by-type");
        }}
        className={`${inputClass} w-full sm:flex-1 sm:max-w-md ${
          !bucket ? "opacity-40 cursor-not-allowed" : ""
        }`}
      >
        <option value="">
          {bucket ? "Select tyre type…" : "— pick a size first —"}
        </option>
        {bucketVariants.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label} — {v.qtyOnHand} in stock
          </option>
        ))}
      </select>
    </div>
  );
}
