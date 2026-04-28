import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/65 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-rose-400 via-orange-300 to-cyan-300 text-slate-900 shadow-[0_8px_24px_rgba(251,113,133,0.35)]",
        ghost: "border border-slate-100/20 bg-slate-900/55 text-slate-100 hover:bg-slate-800/65",
        cyan: "border border-cyan-200/40 bg-cyan-200/10 text-cyan-100 hover:bg-cyan-200/25",
        rose: "border border-rose-200/35 bg-rose-200/10 text-rose-100 hover:bg-rose-200/20",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => {
  return <button className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
