import * as React from "react"
import { cn } from "../../lib/utils"

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

