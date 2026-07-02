"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  PackagePlus,
  Package,
  FileText,
  Wallet,
  Truck,
  RotateCcw,
  Boxes,
  Users,
  UserX,
  Building2,
  BarChart2,
  History,
  Settings,
  LogOut,
} from "lucide-react";

const navLinks = [
  { href: "/dashboard",             label: "Dashboard",        icon: LayoutDashboard },
  { href: "/sales/new",             label: "New Sale",         icon: ShoppingCart },
  { href: "/sales",                 label: "Sales",            icon: ClipboardList },
  { href: "/purchases/new",         label: "New Purchase",     icon: PackagePlus },
  { href: "/purchases",             label: "Purchases",        icon: Package },
  { href: "/quotations/new",        label: "New Quotation",    icon: FileText },
  { href: "/debt-collections/new",  label: "Debt Collection",  icon: Wallet },
  { href: "/supplier-payments/new", label: "Supplier Payment", icon: Truck },
  { href: "/returns/new",           label: "Returns",          icon: RotateCcw },
  { href: "/inventory",             label: "Inventory",        icon: Boxes },
  { href: "/customers",             label: "Customers",        icon: Users },
  { href: "/debtors",               label: "Debtors",          icon: UserX },
  { href: "/suppliers",             label: "Suppliers",        icon: Building2 },
  { href: "/reports",               label: "Reports",          icon: BarChart2 },
  { href: "/history",               label: "History",          icon: History },
  { href: "/settings",              label: "Settings",         icon: Settings },
];

interface SidebarProps {
  userName: string;
}

export default function Sidebar({ userName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-56 flex-shrink-0 bg-[#111111] border-r border-[#2A2A2A] flex flex-col">
      {/* Header */}
      <div className="px-4 py-5 border-b border-[#2A2A2A]">
        <h1 className="text-base font-bold text-[#EAB308] leading-tight">
          Kwambira Tyres
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">Neema Tyres</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-[#EAB308] text-black"
                  : "text-zinc-300 hover:bg-[#1C1C1C] hover:text-white"
              }`}
            >
              <Icon size={15} strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-[#2A2A2A]">
        <p className="text-xs text-zinc-500 mb-3 truncate">{userName}</p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <LogOut size={14} strokeWidth={1.75} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
