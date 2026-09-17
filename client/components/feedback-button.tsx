"use client"

import { useState } from "react"
import { MessageSquare } from "lucide-react"

import { FeedbackModal } from "@/components/feedback-modal"

export function FeedbackButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Leave feedback or ask a question"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-white shadow-lg shadow-black/20 hover:bg-brand/90 active:scale-95 transition-all duration-150 font-mono text-xs font-medium"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        <span>Feedback</span>
      </button>

      <FeedbackModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}
