import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { Dot } from "lucide-react";

import { cn } from "@/lib/utils";

// Define a type for the context value based on input-otp's expected structure
interface OTPInputContextValue {
  slots: { char: string | null; isActive: boolean }[]; // Corrected to match input-otp's SlotProps
}

const InputOTPCell = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div"> & { index: number }
>(({ className, index, ...props }, ref) => {
  // Assert the type of inputOTPContext
  const inputOTPContext = React.useContext(OTPInputContext) as OTPInputContextValue;
  const { char } = inputOTPContext.slots[index];
  const hasChar = !!char;

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md",
        className
      )}
      {...props}
    >
      {char}
      {hasChar && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Dot className="h-4 w-4 animate-bounce" />
        </div>
      )}
    </div>
  );
});
InputOTPCell.displayName = "InputOTPCell";

export { OTPInput, InputOTPCell };