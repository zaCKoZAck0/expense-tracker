import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 [&_svg]:stroke-3 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:scale-[0.97] active:duration-75",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground shadow shadow-primary/25 hover:bg-gradient-to-tl hover:from-primary/80 hover:via-primary hover:to-primary hover:shadow-md hover:shadow-primary/35",
        destructive:
          "bg-gradient-to-br from-destructive via-destructive to-destructive/80 text-destructive-foreground shadow shadow-destructive/25 hover:bg-gradient-to-tl hover:from-destructive/80 hover:via-destructive hover:to-destructive hover:shadow-md hover:shadow-destructive/35 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border-2 border-primary/20 bg-background/80 backdrop-blur-sm shadow-md hover:bg-primary/5 hover:text-primary hover:border-primary/40 dark:bg-input/30 dark:border-primary/30 dark:hover:bg-input/50 dark:hover:border-primary/50",
        secondary:
          "bg-gradient-to-br from-secondary via-secondary to-secondary/80 text-secondary-foreground shadow shadow-secondary/25 hover:bg-gradient-to-tl hover:from-secondary/80 hover:via-secondary hover:to-secondary hover:shadow-md hover:shadow-secondary/35",
        ghost:
          "hover:bg-accent/60 hover:text-accent-foreground backdrop-blur-sm dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-3 has-[>svg]:px-5",
        sm: "h-10 rounded-xl gap-1.5 px-5 has-[>svg]:px-4",
        lg: "h-12 rounded-2xl px-8 has-[>svg]:px-6 text-base",
        icon: "size-11 rounded-2xl",
        "icon-sm": "size-10 rounded-xl",
        "icon-lg": "size-12 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
