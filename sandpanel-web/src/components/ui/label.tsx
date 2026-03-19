import * as LabelPrimitive from "@radix-ui/react-label"
import type { ComponentPropsWithoutRef, ElementRef } from "react"
import { forwardRef } from "react"
import { cn } from "../../lib/utils"

const Label = forwardRef<ElementRef<typeof LabelPrimitive.Root>, ComponentPropsWithoutRef<typeof LabelPrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <LabelPrimitive.Root ref={ref} className={cn("text-sm font-medium leading-none text-zinc-300", className)} {...props} />
  ),
)
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
