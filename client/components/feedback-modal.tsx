"use client"

import { useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Loader2,
  MessageSquare,
  Send,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

type FeedbackType = "review" | "question"

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [type, setType] = useState<FeedbackType>("review")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle")
  const [errorMessage, setErrorMessage] = useState("")

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setStatus("submitting")
    setErrorMessage("")

    try {
      const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_KEY

      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: accessKey,
          subject: `New ${type === "review" ? "Review / Feedback" : "Question"} from ChaibookLM (${name || "Anonymous"})`,
          from_name: name || "ChaibookLM User",
          feedback_type: type,
          name: name || "Anonymous",
          email: email || "Not provided",
          message: message.trim(),
        }),
      })

      const result = await response.json()

      if (result.success) {
        setStatus("success")
        setTimeout(() => {
          setName("")
          setEmail("")
          setMessage("")
          setStatus("idle")
          onClose()
        }, 2200)
      } else {
        setStatus("error")
        setErrorMessage(result.message || "Failed to submit. Please try again.")
      }
    } catch {
      setStatus("error")
      setErrorMessage(
        "Network error. Please check your connection and try again."
      )
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-brand/10 border-brand/20 rounded-lg border p-2 text-brand">
              {type === "review" ? (
                <MessageSquare className="h-4 w-4" />
              ) : (
                <HelpCircle className="h-4 w-4" />
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight">
                {type === "review"
                  ? "Leave a Review or Note"
                  : "Ask a Question"}
              </h3>
              <p className="font-mono text-xs text-muted-foreground">
                Delivered straight to my inbox
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Type Toggle Pills */}
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/60 p-1">
          <button
            type="button"
            onClick={() => setType("review")}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 font-mono text-xs font-medium transition-all ${
              type === "review"
                ? "font-semibold text-white shadow-sm bg-brand"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Review / Note</span>
          </button>
          <button
            type="button"
            onClick={() => setType("question")}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 font-mono text-xs font-medium transition-all ${
              type === "question"
                ? "font-semibold text-white shadow-sm bg-brand"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Ask a Question</span>
          </button>
        </div>

        {/* Success State */}
        {status === "success" ? (
          <div className="flex flex-col items-center justify-center space-y-3 py-10 text-center">
            <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-500">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h4 className="text-base font-semibold">Message Dispatched!</h4>
            <p className="max-w-xs text-xs text-muted-foreground">
              Thank you! Your {type === "review" ? "feedback" : "question"} has
              been emailed directly to Vikas.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block font-mono text-xs text-muted-foreground">
                  Your Name{" "}
                  <span className="text-muted-foreground/50">(optional)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="focus:border-brand w-full rounded-lg border border-border bg-muted/40 px-3.5 py-2 text-xs text-foreground placeholder-muted-foreground transition-colors focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block font-mono text-xs text-muted-foreground">
                  Your Email{" "}
                  <span className="text-muted-foreground/50">
                    (optional, for replies)
                  </span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@company.com"
                  className="focus:border-brand w-full rounded-lg border border-border bg-muted/40 px-3.5 py-2 text-xs text-foreground placeholder-muted-foreground transition-colors focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-xs text-muted-foreground">
                {type === "review" ? "Review or Thoughts" : "Your Question"}{" "}
                <span className="text-destructive">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  type === "review"
                    ? "Feedback on the RAG pipeline, AI features, or a general note..."
                    : "Ask anything about how ChaibookLM works, RAG architecture, or feature requests..."
                }
                className="focus:border-brand w-full resize-none rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 text-xs leading-relaxed text-foreground placeholder-muted-foreground transition-colors focus:outline-none"
              />
            </div>

            {status === "error" && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="font-mono text-[11px] text-muted-foreground">
                🔒 Protected by Web3Forms
              </span>

              <Button
                type="submit"
                disabled={status === "submitting" || !message.trim()}
                size="sm"
                className="hover:bg-brand/90 inline-flex cursor-pointer items-center gap-2 font-mono text-xs text-white bg-brand"
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Send Message</span>
                    <Send className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
