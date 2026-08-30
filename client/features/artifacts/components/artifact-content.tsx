"use client"

import { useState } from "react"
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

import type {
  Artifact,
  FlashcardsContent,
  MindmapContent,
  QuizContent,
  ReportContent,
  SummaryContent,
  TakeawaysContent,
} from "../types"

/**
 * Minimal markdown renderer for artifact content — the app has no markdown
 * library, so this covers the common structures the generator emits:
 * headings (#), bullets (- / *), numbered lists, blockquotes, and inline
 * bold/italic/code cleanup.
 */
function MarkdownView({ text }: { text?: string }) {
  if (!text?.trim()) {
    return (
      <p className="text-sm text-muted-foreground">No content was generated.</p>
    )
  }

  const blocks = text.split("\n")
  return (
    <div className="grid gap-1.5">
      {blocks.map((line, index) => {
        // Models sometimes escape heading markers (\###) inside JSON strings.
        // Normalize those before parsing so Markdown syntax never leaks into UI.
        const trimmed = line.trim().replace(/^\\(?=#{1,6}\s)/, "")
        if (!trimmed) {
          return <div key={index} className="h-1" />
        }

        const heading = trimmed.match(/^(#{1,6})\s+(.*)$/)
        if (heading) {
          const level = heading[1]!.length
          return (
            <p
              key={index}
              className={cn(
                "font-heading font-medium",
                level <= 2 ? "mt-4 text-xl" : "mt-2 text-base"
              )}
            >
              {cleanInline(heading[2]!)}
            </p>
          )
        }

        const bullet = trimmed.match(/^[-*]\s+(.*)$/)
        if (bullet) {
          return (
            <p key={index} className="flex gap-2 text-sm leading-relaxed">
              <span
                aria-hidden="true"
                className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
              />
              <span>{cleanInline(bullet[1]!)}</span>
            </p>
          )
        }

        const numbered = trimmed.match(/^(\d+)[.)]\s+(.*)$/)
        if (numbered) {
          return (
            <p key={index} className="flex gap-2 text-sm leading-relaxed">
              <span className="shrink-0 font-medium text-muted-foreground">
                {numbered[1]}.
              </span>
              <span>{cleanInline(numbered[2]!)}</span>
            </p>
          )
        }

        if (trimmed.startsWith(">")) {
          return (
            <p
              key={index}
              className="border-l-2 border-border pl-3 text-sm leading-relaxed text-muted-foreground italic"
            >
              {cleanInline(trimmed.replace(/^>\s?/, ""))}
            </p>
          )
        }

        return (
          <p key={index} className="text-sm leading-7 sm:text-base">
            {cleanInline(trimmed)}
          </p>
        )
      })}
    </div>
  )
}

/** Removes inline markdown decorations (**bold**, *italic*, `code`). */
function cleanInline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/(\*{1,3})([^*]+?)\1/g, "$2")
    .replace(/_{1,2}([^_]+?)_{1,2}/g, "$1")
}

/** Renders an artifact's generated content based on its type. */
export function ArtifactContent({ artifact }: { artifact: Artifact }) {
  switch (artifact.type) {
    case "SUMMARY":
      return (
        <MarkdownView text={(artifact.content as SummaryContent)?.markdown} />
      )
    case "TAKEAWAYS":
      return <TakeawaysView content={artifact.content as TakeawaysContent} />
    case "FLASHCARDS":
      return <FlashcardsView content={artifact.content as FlashcardsContent} />
    case "QUIZ":
      return <QuizView content={artifact.content as QuizContent} />
    case "MINDMAP":
      return <MindmapView content={artifact.content as MindmapContent} />
    case "REPORT":
      return <ReportView content={artifact.content as ReportContent} />
    default:
      return (
        <p className="text-sm text-muted-foreground">
          Unsupported artifact type.
        </p>
      )
  }
}

function TakeawaysView({ content }: { content?: TakeawaysContent }) {
  if (!content?.items?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No takeaways were generated.
      </p>
    )
  }
  return (
    <ul className="grid gap-2.5">
      {content.items.map((item, index) => (
        <li key={index} className="flex gap-2.5 text-sm leading-relaxed">
          <span
            aria-hidden="true"
            className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function ReportView({ content }: { content?: ReportContent }) {
  if (!content?.sections?.length && !content?.markdown?.trim()) {
    return (
      <p className="text-sm text-muted-foreground">No report was generated.</p>
    )
  }
  return (
    <div className="grid gap-5">
      {content.sections?.length ? (
        content.sections.map((section, index) => (
          <section key={index} className="grid gap-3">
            <h3 className="font-heading text-xl font-medium">
              {cleanInline(section.title)}
            </h3>
            <MarkdownView text={section.content} />
          </section>
        ))
      ) : (
        <MarkdownView text={content.markdown} />
      )}
    </div>
  )
}

function FlashcardsView({ content }: { content?: FlashcardsContent }) {
  const [activeCard, setActiveCard] = useState(0)
  const [flipped, setFlipped] = useState(false)

  if (!content?.cards?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No flashcards were generated.
      </p>
    )
  }

  const cards = content.cards
  const card = cards[activeCard]!
  const isFirstCard = activeCard === 0
  const isLastCard = activeCard === cards.length - 1

  function move(direction: -1 | 1) {
    setActiveCard((current) =>
      Math.max(0, Math.min(cards.length - 1, current + direction))
    )
    setFlipped(false)
  }

  return (
    <section
      aria-label="Flashcard deck"
      className="mx-auto grid w-full max-w-3xl gap-6"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Card {activeCard + 1} of {cards.length}
        </p>
        <button
          type="button"
          onClick={() => setFlipped(false)}
          disabled={!flipped}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <RotateCcwIcon className="size-3.5" />
          Show front
        </button>
      </div>

      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{
            width: `${((activeCard + 1) / cards.length) * 100}%`,
          }}
        />
      </div>

      <div className="[perspective:1400px]">
        <button
          type="button"
          onClick={() => setFlipped((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" && !isFirstCard) {
              event.preventDefault()
              move(-1)
            }
            if (event.key === "ArrowRight" && !isLastCard) {
              event.preventDefault()
              move(1)
            }
          }}
          aria-pressed={flipped}
          aria-label={`${flipped ? "Answer" : "Question"}: ${flipped ? card.back : card.front}. Click to flip.`}
          className={cn(
            "relative block min-h-[22rem] w-full rounded-[2rem] text-left transition-transform duration-700 ease-[cubic-bezier(.2,.75,.2,1)] [transform-style:preserve-3d] focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-none motion-reduce:transition-none sm:min-h-[27rem]",
            flipped && "[transform:rotateY(180deg)]"
          )}
        >
          <span className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[2rem] border border-primary/15 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_12%,var(--card)),var(--card)_55%,color-mix(in_oklab,var(--accent)_65%,var(--card)))] p-7 shadow-xl shadow-primary/10 [backface-visibility:hidden] sm:p-10">
            <span className="flex items-center justify-between text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
              <span>Prompt</span>
              <span className="rounded-full border bg-card/70 px-2.5 py-1 normal-case">
                Tap to reveal
              </span>
            </span>
            <span className="font-heading text-2xl leading-tight font-medium text-balance sm:text-4xl">
              {card.front}
            </span>
            <span className="text-sm text-muted-foreground">
              Press ← or → to move through the deck
            </span>
          </span>

          <span className="absolute inset-0 flex [transform:rotateY(180deg)] flex-col justify-between overflow-hidden rounded-[2rem] border border-primary bg-primary p-7 text-primary-foreground shadow-xl shadow-primary/25 [backface-visibility:hidden] sm:p-10">
            <span className="flex items-center justify-between text-xs font-semibold tracking-[0.15em] text-primary-foreground/65 uppercase">
              <span>Answer</span>
              <span className="rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-2.5 py-1 normal-case">
                Tap to return
              </span>
            </span>
            <span className="font-heading text-2xl leading-tight font-medium text-balance sm:text-4xl">
              {card.back}
            </span>
            <span className="text-sm text-primary-foreground/70">
              Take a moment, then move to the next card.
            </span>
          </span>
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={isFirstCard}
          onClick={() => move(-1)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
        >
          <ChevronLeftIcon className="size-4" />
          Previous
        </button>
        <button
          type="button"
          disabled={isLastCard}
          onClick={() => move(1)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-35"
        >
          Next card
          <ChevronRightIcon className="size-4" />
        </button>
      </div>
    </section>
  )
}

function QuizView({ content }: { content?: QuizContent }) {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [activeQuestion, setActiveQuestion] = useState(0)

  if (!content?.questions?.length) {
    return (
      <p className="text-sm text-muted-foreground">No quiz was generated.</p>
    )
  }

  const question = content.questions[activeQuestion]!
  const selected = answers[activeQuestion]
  const isAnswered = selected !== undefined
  const isLastQuestion = activeQuestion === content.questions.length - 1
  const answeredCount = Object.keys(answers).length
  const correctCount = content.questions.reduce(
    (total, question, index) =>
      answers[index] === question.correctIndex ? total + 1 : total,
    0
  )

  return (
    <div className="mx-auto grid max-w-3xl gap-7">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Question {activeQuestion + 1} of {content.questions.length}
          {answeredCount > 0 ? ` · ${correctCount} correct` : ""}
        </p>
        {answeredCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setAnswers({})
              setActiveQuestion(0)
            }}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none"
          >
            <RotateCcwIcon className="size-3" />
            Retake
          </button>
        )}
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{
            width: `${((activeQuestion + 1) / content.questions.length) * 100}%`,
          }}
        />
      </div>

      <fieldset className="grid gap-6 rounded-3xl border bg-card p-5 shadow-sm sm:p-8">
        <legend className="sr-only">Question {activeQuestion + 1}</legend>
        <p className="font-heading text-xl leading-snug font-medium text-balance sm:text-2xl">
          {question.question}
        </p>
        <div className="grid gap-2.5">
          {question.options.map((option, optionIndex) => {
            const isSelected = selected === optionIndex
            const isCorrect = optionIndex === question.correctIndex
            const showState = isAnswered && (isSelected || isCorrect)
            return (
              <button
                key={optionIndex}
                type="button"
                disabled={isAnswered}
                onClick={() =>
                  setAnswers((previous) => ({
                    ...previous,
                    [activeQuestion]: optionIndex,
                  }))
                }
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition-all sm:text-base",
                  !isAnswered &&
                    "hover:border-primary/30 hover:bg-accent/35 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                  showState &&
                    isCorrect &&
                    "border-emerald-500/40 bg-emerald-500/10",
                  showState &&
                    isSelected &&
                    !isCorrect &&
                    "border-destructive/40 bg-destructive/10"
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    showState &&
                      isCorrect &&
                      "border-emerald-500 bg-emerald-500 text-white",
                    showState &&
                      isSelected &&
                      !isCorrect &&
                      "border-destructive bg-destructive text-white"
                  )}
                >
                  {showState ? (
                    isCorrect ? (
                      <CheckIcon className="size-3.5" />
                    ) : (
                      <XIcon className="size-3.5" />
                    )
                  ) : (
                    String.fromCharCode(65 + optionIndex)
                  )}
                </span>
                <span>{option}</span>
              </button>
            )
          })}
        </div>
        {isAnswered && question.explanation ? (
          <aside className="rounded-xl border-l-2 border-primary bg-accent/30 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            <span className="mr-1 font-semibold text-foreground">Why:</span>
            {question.explanation}
          </aside>
        ) : (
          <p className="text-sm text-muted-foreground">
            Choose an answer to reveal the explanation.
          </p>
        )}
      </fieldset>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={activeQuestion === 0}
          onClick={() => setActiveQuestion((current) => current - 1)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeftIcon className="size-4" /> Previous
        </button>
        <button
          type="button"
          disabled={!isAnswered}
          onClick={() => {
            if (isLastQuestion) setActiveQuestion(0)
            else setActiveQuestion((current) => current + 1)
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-40"
        >
          {isLastQuestion ? "Review from start" : "Next question"}
          <ChevronRightIcon className="size-4" />
        </button>
      </div>
    </div>
  )
}

function MindmapView({ content }: { content?: MindmapContent }) {
  if (!content?.nodes?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No mind map was generated.
      </p>
    )
  }

  const nodes = content.nodes
  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges = (content.edges ?? []).filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
  )
  const degree = new Map<string, number>()
  for (const edge of edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1)
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1)
  }
  const center = [...nodes].sort(
    (a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0)
  )[0]!
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const branches = edges
    .filter((edge) => edge.source === center.id)
    .map((edge) => nodeById.get(edge.target))
    .filter(Boolean)
  const branchIds = new Set(branches.map((node) => node!.id))
  const remaining = nodes.filter(
    (node) => node.id !== center.id && !branchIds.has(node.id)
  )

  return (
    <section aria-label="Mind map" className="mx-auto grid max-w-6xl gap-8">
      <div className="mx-auto max-w-2xl rounded-3xl bg-primary px-6 py-8 text-center text-primary-foreground shadow-lg shadow-primary/15">
        <p className="text-xs font-semibold tracking-[0.15em] text-primary-foreground/65 uppercase">
          Central idea
        </p>
        <h3 className="mt-2 font-heading text-2xl font-medium sm:text-3xl">
          {center.label}
        </h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...branches, ...remaining].map(
          (node) =>
            node && (
              <article
                key={node.id}
                className="relative rounded-2xl border bg-card p-5 shadow-sm before:absolute before:-top-4 before:left-1/2 before:h-4 before:w-px before:bg-border"
              >
                <p className="text-sm leading-relaxed sm:text-base">
                  {node.label}
                </p>
              </article>
            )
        )}
      </div>
    </section>
  )
}
