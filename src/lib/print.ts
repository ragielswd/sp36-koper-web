import { toast } from "sonner";

/**
 * Print arbitrary HTML via a hidden iframe. Avoids popup blockers and stray
 * new tabs. Cleans up the iframe after printing.
 */
export function printHtml(html: string) {
  if (typeof window === "undefined") return;
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    toast.error("Gagal membuat dokumen cetak");
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => {
    setTimeout(() => {
      try { document.body.removeChild(iframe); } catch { /* noop */ }
    }, 1500);
  };

  const trigger = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error(err);
      toast.error("Gagal mencetak");
    } finally {
      cleanup();
    }
  };

  // Wait for images/fonts inside the iframe to settle
  if (iframe.contentWindow) {
    iframe.contentWindow.addEventListener("afterprint", cleanup);
  }
  if (doc.readyState === "complete") {
    setTimeout(trigger, 250);
  } else {
    iframe.addEventListener("load", () => setTimeout(trigger, 250));
  }
}
