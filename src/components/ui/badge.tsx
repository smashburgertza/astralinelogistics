import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-white hover:bg-[hsl(42_90%_52%)]",
        secondary: "border-transparent bg-accent text-white hover:bg-[hsl(202_74%_38%)]",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "border-accent/30 text-accent bg-accent/10",
        success: "border-transparent bg-success/15 text-success",
        warning: "border-transparent bg-primary/15 text-[hsl(42_90%_45%)]",
        info: "border-transparent bg-accent/15 text-accent",
        collected: "border-transparent bg-[hsl(202_74%_50%/0.15)] text-[hsl(202_74%_46%)]",
        in_transit: "border-transparent bg-[hsl(42_92%_60%/0.15)] text-[hsl(42_90%_45%)]",
        arrived: "border-transparent bg-[hsl(270_60%_55%/0.15)] text-[hsl(270_60%_55%)]",
        delivered: "border-transparent bg-success/15 text-success",
        pending: "border-transparent bg-primary/15 text-[hsl(42_90%_45%)]",
        paid: "border-transparent bg-success/15 text-success",
        overdue: "border-transparent bg-destructive/15 text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
