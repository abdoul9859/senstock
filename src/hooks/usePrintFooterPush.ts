import { useEffect } from "react";

/**
 * Before printing, measures #invoice-print-area > div and sets its min-height
 * to fill the last printed page exactly, so that a flex footer with
 * margin-top: auto is pushed to the bottom of the last page.
 *
 * Page geometry (A4):
 *   All pages → 297 mm of content (margin: 0)
 */
export function usePrintFooterPush() {
  useEffect(() => {
    let savedMinHeight = "";

    function handleBeforePrint() {
      const root = document.querySelector<HTMLElement>(
        "#invoice-print-area > div"
      );
      if (!root) return;

      // Measure px-per-mm using a temporary ruler
      const ruler = document.createElement("div");
      ruler.style.cssText =
        "position:absolute;visibility:hidden;height:1mm;width:1mm;";
      document.body.appendChild(ruler);
      const pxPerMm = ruler.offsetHeight;
      document.body.removeChild(ruler);
      if (pxPerMm === 0) return;

      const PAGE_FULL = 297 * pxPerMm; // A4 page height (no margin)
      const PAGE_REST = PAGE_FULL; // same for all pages

      savedMinHeight = root.style.minHeight;
      const contentH = root.scrollHeight;

      if (contentH <= PAGE_FULL) return; // single page — flex already works

      const remaining = contentH - PAGE_FULL;
      const extraPages = Math.ceil(remaining / PAGE_REST);
      const targetH = PAGE_FULL + extraPages * PAGE_REST;

      root.style.minHeight = targetH + "px";
    }

    function handleAfterPrint() {
      const root = document.querySelector<HTMLElement>(
        "#invoice-print-area > div"
      );
      if (root) {
        root.style.minHeight = savedMinHeight || "297mm";
      }
    }

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);
}
