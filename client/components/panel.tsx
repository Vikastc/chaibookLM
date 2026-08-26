import { cn } from "@/lib/utils"

/** Floating panel used by the workspace three-column layout. */
export function Panel({
  children,
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-2xs",
        className
      )}
      {...props}
    >
      {children}
    </section>
  )
}

export function PanelHeader({
  title,
  children,
}: {
  title: string
  children?: React.ReactNode
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-5">
      <h2 className="truncate font-heading text-base font-medium tracking-tight">
        {title}
      </h2>
      {children}
    </header>
  )
}
