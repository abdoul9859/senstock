import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface BarcodeConfig {
  format?: string;
  width?: number;
  height?: number;
  fontSize?: number;
  displayValue?: boolean;
}

interface BarcodeDisplayProps {
  value: string;
  label?: string;
  showPrint?: boolean;
  config?: BarcodeConfig;
}

export const BarcodeDisplay = ({ value, label, showPrint = true, config }: BarcodeDisplayProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: config?.format || "CODE128",
          width: config?.width ?? 1.5,
          height: config?.height ?? 50,
          displayValue: config?.displayValue ?? true,
          fontSize: config?.fontSize ?? 12,
          margin: 5,
          background: "transparent",
          lineColor: "#000000",
        });
      } catch {
        if (svgRef.current) {
          svgRef.current.innerHTML = "";
        }
      }
    }
  }, [value, config?.format, config?.width, config?.height, config?.fontSize, config?.displayValue]);

  function handlePrint() {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    // Clone SVG and force black for printing on white paper
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.classList.remove("barcode-themed");
    clone.querySelectorAll("rect, text").forEach((el) => {
      const fill = el.getAttribute("fill");
      if (fill && fill !== "transparent" && fill !== "none") el.setAttribute("fill", "#000000");
    });
    const svgData = new XMLSerializer().serializeToString(clone);
    const printWindow = window.open("", "_blank", "width=400,height=300");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Code-barres ${value}</title>
        <style>
          body {
            margin: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            font-family: Arial, sans-serif;
          }
          .label {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 8px;
          }
          svg {
            max-width: 100%;
          }
          @media print {
            body { margin: 0; padding: 10mm; }
          }
        </style>
      </head>
      <body>
        ${label ? `<div class="label">${label}</div>` : ""}
        ${svgData}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  if (!value) return <span className="text-sm text-muted-foreground">—</span>;

  return (
    <div className="flex items-center gap-2">
      <svg ref={svgRef} className="barcode-themed max-w-[180px] text-foreground" />
      {showPrint && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={handlePrint}
          title="Imprimer le code-barres"
        >
          <Printer className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
};
