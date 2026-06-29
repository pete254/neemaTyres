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
