import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition",
  {
    variants: {
      variant: {
        default: "border-cyan-200/35 bg-cyan-200/10 text-cyan-100",
        muted: "border-slate-200/25 bg-slate-900/60 text-slate-200/80",
        rose: "border-rose-200/35 bg-rose-200/10 text-rose-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
