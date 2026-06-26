"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/sales/new", label: "New Sale" },
  { href: "/purchases/new", label: "New Purchase" },
  { href: "/debt-collections/new", label: "Debt Collection" },
  { href: "/supplier-payments/new", label: "Supplier Payment" },
  { href: "/returns/new", label: "Returns" },
  { href: "/inventory", label: "Inventory" },
  { href: "/debtors", label: "Debtors" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/reports", label: "Reports" },
  { href: "/exceptions", label: "Exceptions" },
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
        {navLinks.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-[#EAB308] text-black"
                  : "text-zinc-300 hover:bg-[#1C1C1C] hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-[#2A2A2A]">
        <p className="text-xs text-zinc-500 mb-3 truncate">{userName}</p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-left text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
