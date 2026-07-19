import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type MoneyInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> & {
  value: string | number;
  onChange: (raw: string) => void;
};

function formatID(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onChange, className, inputMode = "numeric", ...rest },
  ref,
) {
  const display = formatID(String(value ?? ""));
  return (
    <Input
      ref={ref}
      inputMode={inputMode}
      type="text"
      className={cn(className)}
      value={display}
      onChange={(e) => {
        const digits = e.target.value.replace(/[^\d]/g, "");
        onChange(digits);
      }}
      {...rest}
    />
  );
});
