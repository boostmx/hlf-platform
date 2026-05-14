"use client";

import { forwardRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Numeric input that:
//  - hides browser spinner buttons (uglier than they're worth)
//  - opens the numeric keypad on mobile (inputMode="decimal")
//  - blurs on wheel so accidental scrolls don't change the value
//  - exposes the parsed number via onValueChange (null when empty)
//  - clamps to min/max on blur if provided
//
// Keeps Input's native text behaviour underneath so paste, undo, etc. all work.

interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  value: number | string | null | undefined;
  onValueChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;        // visual hint; not enforced strictly
  allowDecimal?: boolean;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  function NumberInput(
    { value, onValueChange, min, max, step, allowDecimal = true, className, onBlur, ...rest },
    ref,
  ) {
    const display =
      value === null || value === undefined || (typeof value === "number" && Number.isNaN(value))
        ? ""
        : String(value);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        if (raw === "") {
          onValueChange(null);
          return;
        }
        // Allow intermediate states like "-", "1.", ".5" without losing focus.
        const pattern = allowDecimal ? /^-?\d*\.?\d*$/ : /^-?\d*$/;
        if (!pattern.test(raw)) return;
        const n = Number(raw);
        onValueChange(Number.isFinite(n) ? n : null);
      },
      [onValueChange, allowDecimal],
    );

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        if (typeof value === "number" && Number.isFinite(value)) {
          let v = value;
          if (min !== undefined && v < min) v = min;
          if (max !== undefined && v > max) v = max;
          if (v !== value) onValueChange(v);
        }
        onBlur?.(e);
      },
      [value, min, max, onValueChange, onBlur],
    );

    return (
      <Input
        ref={ref}
        type="text"
        inputMode={allowDecimal ? "decimal" : "numeric"}
        autoComplete="off"
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        onWheel={(e) => (e.target as HTMLInputElement).blur()}
        // The class kills WebKit + Firefox spinner styling.
        className={cn(
          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0",
          className,
        )}
        step={step}
        {...rest}
      />
    );
  },
);
