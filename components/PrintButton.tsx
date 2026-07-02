"use client";

export function PrintButton({ className }: { className?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className={className}
    >
      Export PDF
    </button>
  );
}

export default function PrintBtn({ label = "Print" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="bg-[#4B0082] hover:bg-[#3a006b] text-white font-semibold rounded px-4 py-2 text-sm transition-colors"
    >
      🖨 {label}
    </button>
  );
}
