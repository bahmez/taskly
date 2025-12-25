import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const sheetVariants = cva(
  "fixed inset-0 z-50 flex flex-col transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  {
    variants: {
      side: {
        top: "border-b bg-background",
        bottom: "border-t bg-background",
        left: "border-r bg-background",
        right: "border-l bg-background",
      },
    },
    defaultVariants: {
      side: "left",
    },
  }
)

// Simplified Shell component for the main app structure
const Shell = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex min-h-screen flex-col", className)}
    {...props}
  />
))
Shell.displayName = "Shell"

const Header = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <header
    ref={ref}
    className={cn(
      "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      className
    )}
    {...props}
  />
))
Header.displayName = "Header"

export { Shell, Header }

