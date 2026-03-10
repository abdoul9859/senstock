import { Minus, Plus } from "lucide-react";

interface QuantityPickerProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}

export function QuantityPicker({ value, onChange, min = 1, max = 99 }: QuantityPickerProps) {
  return (
    <div className="inline-flex items-center rounded-[var(--shop-radius,0.5rem)] border border-border">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="flex h-9 w-10 items-center justify-center text-sm font-medium tabular-nums">
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
