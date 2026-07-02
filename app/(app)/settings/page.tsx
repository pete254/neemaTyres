import { getShopInfo } from "@/lib/shopInfo";
import { updateShopInfo } from "@/lib/actions/settings";

const inputClass = "w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]";

export default async function SettingsPage() {
  const shop = await getShopInfo();

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-2">Shop Settings</h1>
      <p className="text-sm text-zinc-500 mb-8">
        This information appears on invoices, delivery notes, and quotations.
      </p>

      <form action={updateShopInfo} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm text-zinc-300 mb-1">Shop Name *</label>
            <input name="name" required defaultValue={shop.name} className={inputClass} placeholder="Kwambira Tyres" />
          </div>
          <div>
            <label className="block text-sm text-zinc-300 mb-1">P.O. Box</label>
            <input name="poBox" defaultValue={shop.poBox ?? ""} className={inputClass} placeholder="P.O. Box 1338" />
          </div>
          <div>
            <label className="block text-sm text-zinc-300 mb-1">Address / Street</label>
            <input name="address" defaultValue={shop.address ?? ""} className={inputClass} placeholder="Limuru Road" />
          </div>
          <div>
            <label className="block text-sm text-zinc-300 mb-1">Town</label>
            <input name="town" defaultValue={shop.town ?? ""} className={inputClass} placeholder="Limuru" />
          </div>
          <div>
            <label className="block text-sm text-zinc-300 mb-1">County</label>
            <input name="county" defaultValue={shop.county ?? ""} className={inputClass} placeholder="Kiambu" />
          </div>
          <div>
            <label className="block text-sm text-zinc-300 mb-1">Country</label>
            <input name="country" defaultValue={shop.country} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm text-zinc-300 mb-1">Email</label>
            <input name="email" type="email" defaultValue={shop.email ?? ""} className={inputClass} placeholder="info@kwambiratyres.co.ke" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-zinc-300 mb-1">Phone</label>
            <input name="phone" defaultValue={shop.phone ?? ""} className={inputClass} placeholder="+254 702 405 174" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-zinc-300 mb-1">
              Terms &amp; Conditions
              <span className="text-zinc-500 font-normal ml-2">one per line</span>
            </label>
            <textarea
              name="terms"
              rows={4}
              defaultValue={shop.terms.join("\n")}
              className={inputClass}
              placeholder={"The prices are inclusive of VAT.\nThe prices are inclusive of delivery / shipping."}
            />
          </div>
        </div>

        <button
          type="submit"
          className="bg-[#EAB308] hover:bg-[#CA8A04] text-black font-semibold rounded px-6 py-2.5 text-sm transition-colors"
        >
          Save Settings
        </button>
      </form>
    </div>
  );
}
