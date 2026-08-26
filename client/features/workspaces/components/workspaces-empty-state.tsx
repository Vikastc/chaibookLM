"use client"

import { PlusIcon } from "lucide-react"

import { LogoMark } from "@/components/brand"
import { Button } from "@/components/ui/button"

export function WorkspacesEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center py-28 text-center">
      <LogoMark className="size-14 rounded-2xl [&_svg]:size-7" />
      <h2 className="mt-8 font-heading text-3xl font-medium tracking-tight">
        Welcome to chaibook
      </h2>
      <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
        Create your first workspace — add sources, ask questions, and keep what
        you learn.
      </p>
      <Button
        size="lg"
        className="mt-10 h-11 px-5 text-base"
        onClick={onCreate}
      >
        <PlusIcon />
        New workspace
      </Button>
    </div>
  )
}
