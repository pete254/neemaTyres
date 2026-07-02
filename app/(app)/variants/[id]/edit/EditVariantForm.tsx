"use client";

import { useState } from "react";

interface Props {
  action: (formData: FormData) => Promise<void>;
  brands: { id: string; name: string }[];
  variant: {
    brand: { name: string };
    sizeCanonical: string;
    position: string;
    subLabel: string | null;
    patternCode: string | null;
    referenceSellPrice: string | null;
  };
}

export default function EditVariantForm({ action, brands, variant }: Props) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-sm text-zinc-300 mb-1">Brand Name</label>
        <input
          name="brandName"
          required
          list="brand-list"
          defaultValue={variant.brand.name}
          className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
        />
        <datalist id="brand-list">
          {brands.map((b) => <option key={b.id} value={b.name} />)}
        </datalist>
      </div>

      <div>
        <label className="block text-sm text-zinc-300 mb-1">Size Canonical</label>
        <input
          name="sizeCanonical"
          required
          defaultValue={variant.sizeCanonical}
          className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
        />
        <p className="text-xs text-zinc-500 mt-1">Changing this affects all historical records for this tyre</p>
      </div>

      <div>
        <label className="block text-sm text-zinc-300 mb-1">Position</label>
        <select
          name="position"
          required
          defaultValue={variant.position}
          className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
        >
          <option value="AP">AP (All Position)</option>
          <option value="DIFF">DIFF (Drive/Diff)</option>
          <option value="STEERING">STEERING</option>
          <option value="NONE">NONE</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-zinc-300 mb-1">Sub Label <span className="text-zinc-500">(optional)</span></label>
        <input
          name="subLabel"
          defaultValue={variant.subLabel ?? ""}
          placeholder="e.g. Drive, Trailer"
          className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
        />
      </div>

      <div>
        <label className="block text-sm text-zinc-300 mb-1">Pattern Code <span className="text-zinc-500">(optional)</span></label>
        <input
          name="patternCode"
          defaultValue={variant.patternCode ?? ""}
          placeholder="e.g. MA668"
          className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
        />
      </div>

      <div>
        <label className="block text-sm text-zinc-300 mb-1">Reference Sell Price (KES) <span className="text-zinc-500">(optional)</span></label>
        <input
          name="referenceSellPrice"
          type="number"
          step="0.01"
          min="0"
          defaultValue={variant.referenceSellPrice ?? ""}
          placeholder="0.00"
          className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
        />
      </div>

      {/* Confirmation */}
      <div className="border border-yellow-800 bg-yellow-950/30 rounded-lg p-4 mt-4">
        <p className="text-yellow-300 text-sm font-semibold mb-1">⚠ Warning</p>
        <p className="text-yellow-200/70 text-xs mb-3">
          Editing a tyre type updates its name and attributes across all historical purchases, sales, and stock records. This cannot be undone.
        </p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 accent-yellow-400"
          />
          <span className="text-yellow-200 text-sm">I understand and confirm this change</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={!confirmed}
        className="w-full bg-[#EAB308] hover:bg-[#CA8A04] disabled:opacity-30 disabled:cursor-not-allowed text-black font-semibold rounded py-2.5 text-sm transition-colors"
      >
        Save Changes
      </button>
    </form>
  );
}
