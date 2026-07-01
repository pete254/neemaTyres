"use client";

import { useState, useTransition } from "react";
import { updateCustomerDetails } from "@/lib/actions/customer";

interface Props {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  town: string | null;
  poBox: string | null;
}

const inputClass =
  "w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]";

export default function ContactEditor({ id, name, phone, email, address, town, poBox }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.append("id", id);
    startTransition(async () => {
      try {
        await updateCustomerDetails(fd);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save.");
      }
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-zinc-500 hover:text-[#EAB308] border border-[#2A2A2A] rounded px-3 py-1.5 transition-colors"
      >
        Edit details
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4 space-y-3 max-w-md">
      {saved && <p className="text-xs text-green-400">Saved successfully.</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}

      <p className="text-sm font-semibold text-zinc-300">Edit Details</p>

      <div>
        <label className="block text-xs text-zinc-400 mb-1">Customer Name <span className="text-red-400">*</span></label>
        <input
          name="name"
          required
          defaultValue={name}
          placeholder="Customer name"
          className={inputClass}
        />
      </div>

      <p className="text-xs text-zinc-500">Contact fields are optional.</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Phone</label>
          <input name="phone" type="tel" defaultValue={phone ?? ""} placeholder="e.g. 0712 345 678" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Email</label>
          <input name="email" type="email" defaultValue={email ?? ""} placeholder="e.g. customer@email.com" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Address / House</label>
          <input name="address" defaultValue={address ?? ""} placeholder="Street / plot no." className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Town</label>
          <input name="town" defaultValue={town ?? ""} placeholder="e.g. Nairobi" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">P.O. Box</label>
          <input name="poBox" defaultValue={poBox ?? ""} placeholder="e.g. P.O. Box 1234-00100" className={inputClass} />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="bg-[#EAB308] hover:bg-[#CA8A04] disabled:opacity-50 text-black font-semibold rounded px-4 py-1.5 text-sm transition-colors"
        >
          {isPending ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          className="text-sm text-zinc-400 hover:text-white px-3 py-1.5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
