"use client";

import { useState } from "react";

interface Props {
  action: (formData: FormData) => Promise<void>;
  deleteAction: () => Promise<void>;
  deleteError?: boolean;
  brands: { id: string; name: string }[];
  variant: {
    brand: { name: string };
    sizeBucket: string;
    sizeCanonical: string;
    position: string;
    subLabel: string | null;
    patternCode: string | null;
    referenceSellPrice: string | null;
  };
}

const inputClass = "w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]";

export default function EditVariantForm({ action, deleteAction, deleteError, brands, variant }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-zinc-300 mb-1">Size</label>
          <input
            name="sizeBucket"
            defaultValue={variant.sizeBucket}
            placeholder="e.g. 22.5, 16, 19.5"
            className={inputClass}
          />
          <p className="text-xs text-zinc-500 mt-1">Rim size bucket</p>
        </div>
        <div>
          <label className="block text-sm text-zinc-300 mb-1">Name</label>
          <input
            name="sizeCanonical"
            required
            defaultValue={variant.sizeCanonical}
            className={inputClass}
          />
          <p className="text-xs text-zinc-500 mt-1">Changing this affects all historical records</p>
        </div>
      </div>

      <div>
        <label className="block text-sm text-zinc-300 mb-1">Brand</label>
        <input
          name="brandName"
          required
          list="brand-list"
          defaultValue={variant.brand.name}
          className={inputClass}
        />
        <datalist id="brand-list">
          {brands.map((b) => <option key={b.id} value={b.name} />)}
        </datalist>
      </div>

      <div>
        <label className="block text-sm text-zinc-300 mb-1">Pos</label>
        <select
          name="position"
          required
          defaultValue={variant.position}
          className={inputClass}
        >
          <option value="AP">AP (All Position)</option>
          <option value="DIFF">DIFF (Drive/Diff)</option>
          <option value="STEERING">STEERING</option>
          <option value="NONE">NONE</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-zinc-300 mb-1">Sub <span className="text-zinc-500">(optional)</span></label>
          <input
            name="subLabel"
            defaultValue={variant.subLabel ?? ""}
            placeholder="e.g. Drive, Trailer"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-300 mb-1">Pattern <span className="text-zinc-500">(optional)</span></label>
          <input
            name="patternCode"
            defaultValue={variant.patternCode ?? ""}
            placeholder="e.g. MA668"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-zinc-300 mb-1">Sell Ref (KES) <span className="text-zinc-500">(optional)</span></label>
        <input
          name="referenceSellPrice"
          type="number"
          step="0.01"
          min="0"
          defaultValue={variant.referenceSellPrice ?? ""}
          placeholder="0.00"
          className={inputClass}
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

      {/* Delete */}
      <div className="border border-red-900 bg-red-950/20 rounded-lg p-4 mt-6">
        <p className="text-red-400 text-sm font-semibold mb-1">Delete Tyre Type</p>
        {deleteError ? (
          <p className="text-red-300 text-sm bg-red-900/30 border border-red-800 rounded px-3 py-2 mb-3">
            Cannot delete — this tyre has sales, purchases, returns, or opening stock records linked to it. Remove those records first.
          </p>
        ) : (
          <p className="text-red-300/60 text-xs mb-3">
            This permanently removes the tyre from inventory. Only possible if it has no sales, purchases, or stock history.
          </p>
        )}
        <label className="flex items-start gap-3 cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={deleteConfirmed}
            onChange={(e) => setDeleteConfirmed(e.target.checked)}
            className="mt-0.5 accent-red-500"
          />
          <span className="text-red-300 text-sm">I want to permanently delete this tyre type</span>
        </label>
        <form action={deleteAction}>
          <button
            type="submit"
            disabled={!deleteConfirmed}
            className="w-full bg-red-700 hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold rounded py-2 text-sm transition-colors"
          >
            Delete Tyre Type
          </button>
        </form>
      </div>
    </form>
  );
}
