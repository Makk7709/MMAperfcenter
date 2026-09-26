import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Chamfered variants are clipped, so a ring or outline would be cut off:
// they show focus with an inset ivory line instead.
const chamferFocus = "focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-[inset_0_0_0_2px_hsl(var(--korev-ivory)/0.9)]"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium tracking-wide ring-offset-background transition-[filter,background-color,border-color,color,transform] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: `bg-gradient-primary text-primary-foreground korev-chamfer shadow-[inset_0_1px_0_hsl(0_0%_100%/0.35)] hover:brightness-110 ${chamferFocus}`,
        destructive: `bg-destructive text-destructive-foreground korev-chamfer hover:brightness-110 ${chamferFocus}`,
        outline: `korev-frame korev-chamfer text-foreground hover:brightness-125 ${chamferFocus}`,
        secondary: "bg-secondary/70 border border-border text-foreground hover:bg-secondary hover:border-primary/40",
        ghost: "text-foreground hover:bg-muted/70",
        link: "text-primary underline-offset-4 hover:underline",
        hero: `bg-gradient-primary text-primary-foreground korev-chamfer font-display text-base font-semibold uppercase tracking-[0.06em] shadow-[inset_0_1px_0_hsl(0_0%_100%/0.35)] hover:brightness-110 hover:shadow-glow ${chamferFocus}`,
        fitness: `bg-gradient-primary text-primary-foreground korev-chamfer hover:brightness-110 ${chamferFocus}`,
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 [--chamfer:7px]",
        lg: "h-12 px-8 [--chamfer:12px]",
        icon: "h-10 w-10 [--chamfer:8px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
