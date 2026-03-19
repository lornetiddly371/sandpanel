import { cva, type VariantProps } from "class-variance-authority"
import type { HTMLAttributes } from "react"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-zinc-700 bg-zinc-800 text-zinc-100",
        success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
        destructive: "border-red-500/40 bg-red-500/10 text-red-300",
        secondary: "border-indigo-500/40 bg-indigo-500/10 text-indigo-300",
      },
    },
    defaultVariants: { variant: "default" },
  },
)

export interface BadgeProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
