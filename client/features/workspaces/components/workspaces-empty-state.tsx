"use client"

import { PlusIcon } from "lucide-react"

import { LogoMark } from "@/components/brand"
import { Button } from "@/components/ui/button"

export function WorkspacesEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <LogoMark className="size-12 rounded-2xl [&_svg]:size-6" />
      <h2 className="mt-6 text-xl font-medium tracking-tight">
        Welcome to chaibook
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Create your first workspace — add sources, ask questions, and keep what
        you learn.
      </p>
      <Button size="lg" className="mt-8" onClick={onCreate}>
        <PlusIcon />
        New workspace
      </Button>
    </div>
  )
}
