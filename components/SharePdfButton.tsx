"use client";

import { useState } from "react";

/**
 * Fetches a PDF and opens the native share sheet (WhatsApp, email, …) with the
 * file attached. Falls back to a plain download where file sharing isn't
 * supported (most desktop browsers).
 */
export function SharePdfButton({
  url,
  filename,
  title,
  className,
}: {
  url: string;
  filename: string;
  title: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function share() {
    setBusy(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`PDF request failed (${res.status})`);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: "application/pdf" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title });
        return;
      }

      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(href);
    } catch (err) {
      // User dismissing the share sheet is not an error worth surfacing.
      if ((err as Error).name !== "AbortError") console.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={share} disabled={busy} className={className}>
      {busy ? "Preparing…" : "Share PDF"}
    </button>
  );
}
