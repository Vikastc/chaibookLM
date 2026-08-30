import { cn } from "@/lib/utils"

/** Primary workspace surface. */
export function Panel({
  children,
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden border bg-card",
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
      <h2 className="truncate text-sm font-semibold">{title}</h2>
      {children}
    </header>
  )
}
