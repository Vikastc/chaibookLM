"use client"

import { useState } from "react"
import { CheckIcon, RotateCcwIcon, XIcon } from "lucide-react"

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
        const trimmed = line.trim()
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
                level <= 2 ? "text-base" : "text-sm"
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
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
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
              className="border-l-2 border-border pl-3 text-sm italic leading-relaxed text-muted-foreground"
            >
              {cleanInline(trimmed.replace(/^>\s?/, ""))}
            </p>
          )
        }

        return (
          <p key={index} className="text-sm leading-relaxed">
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
      return <MarkdownView text={(artifact.content as SummaryContent)?.markdown} />
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
        <p className="text-sm text-muted-foreground">Unsupported artifact type.</p>
      )
  }
}

function TakeawaysView({ content }: { content?: TakeawaysContent }) {
  if (!content?.items?.length) {
    return (
      <p className="text-sm text-muted-foreground">No takeaways were generated.</p>
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
    return <p className="text-sm text-muted-foreground">No report was generated.</p>
  }
  return (
    <div className="grid gap-5">
      {content.sections?.map((section, index) => (
        <section key={index} className="grid gap-1.5">
          <h3 className="font-heading text-base font-medium">{section.title}</h3>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {cleanInline(section.content)}
          </p>
        </section>
      ))}
    </div>
  )
}

function FlashcardsView({ content }: { content?: FlashcardsContent }) {
  const [flipped, setFlipped] = useState<ReadonlySet<number>>(new Set())

  if (!content?.cards?.length) {
    return (
      <p className="text-sm text-muted-foreground">No flashcards were generated.</p>
    )
  }

  function toggle(index: number) {
    setFlipped((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {content.cards.map((card, index) => {
        const isFlipped = flipped.has(index)
        return (
          <button
            key={index}
            type="button"
            onClick={() => toggle(index)}
            aria-pressed={isFlipped}
            className={cn(
              "flex min-h-28 flex-col gap-2 rounded-xl border p-3.5 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
              isFlipped && "border-primary/30 bg-accent/60"
            )}
          >
            <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              {isFlipped ? "Answer" : `Card ${index + 1}`}
            </span>
            <span className="text-sm leading-relaxed">
              {isFlipped ? card.back : card.front}
            </span>
          </button>
        )
      })}
      <p className="col-span-full text-xs text-muted-foreground">
        Click a card to flip it.
      </p>
    </div>
  )
}

function QuizView({ content }: { content?: QuizContent }) {
  const [answers, setAnswers] = useState<Record<number, number>>({})

  if (!content?.questions?.length) {
    return <p className="text-sm text-muted-foreground">No quiz was generated.</p>
  }

  const answeredCount = Object.keys(answers).length
  const correctCount = content.questions.reduce(
    (total, question, index) =>
      answers[index] === question.correctIndex ? total + 1 : total,
    0
  )

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          {answeredCount}/{content.questions.length} answered
          {answeredCount > 0 ? ` · ${correctCount} correct` : ""}
        </p>
        {answeredCount > 0 && (
          <button
            type="button"
            onClick={() => setAnswers({})}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none"
          >
            <RotateCcwIcon className="size-3" />
            Retake
          </button>
        )}
      </div>

      {content.questions.map((question, qIndex) => {
        const selected = answers[qIndex]
        const isAnswered = selected !== undefined
        return (
          <fieldset key={qIndex} className="grid gap-2">
            <legend className="text-sm font-medium text-balance">
              {qIndex + 1}. {question.question}
            </legend>
            <div className="grid gap-1.5">
              {question.options.map((option, oIndex) => {
                const isSelected = selected === oIndex
                const isCorrect = oIndex === question.correctIndex
                const showState = isAnswered && (isSelected || isCorrect)
                return (
                  <button
                    key={oIndex}
                    type="button"
                    disabled={isAnswered}
                    onClick={() =>
                      setAnswers((prev) => ({ ...prev, [qIndex]: oIndex }))
                    }
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      !isAnswered &&
                        "hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                      showState &&
                        isCorrect &&
                        "border-emerald-500/40 bg-emerald-500/10",
                      showState &&
                        isSelected &&
                        !isCorrect &&
                        "border-destructive/40 bg-destructive/10"
                    )}
                  >
                    {showState &&
                      (isCorrect ? (
                        <CheckIcon className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <XIcon className="size-3.5 shrink-0 text-destructive" />
                      ))}
                    <span className="min-w-0">{option}</span>
                  </button>
                )
              })}
            </div>
            {isAnswered && question.explanation && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {question.explanation}
              </p>
            )}
          </fieldset>
        )
      })}
    </div>
  )
}

function MindmapView({ content }: { content?: MindmapContent }) {
  if (!content?.nodes?.length) {
    return (
      <p className="text-sm text-muted-foreground">No mind map was generated.</p>
    )
  }

  const nodes = content.nodes.slice(0, 12)
  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges = (content.edges ?? []).filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
  )

  // Circular layout: the most-connected node sits at the center.
  const degree = new Map<string, number>()
  for (const edge of edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1)
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1)
  }
  const sorted = [...nodes].sort(
    (a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0)
  )
  const center = sorted[0]
  const orbit = sorted.slice(1)

  const CX = 200
  const CY = 170
  const R = 125
  const positions = new Map<string, { x: number; y: number }>([
    [center.id, { x: CX, y: CY }],
  ])
  orbit.forEach((node, index) => {
    const angle = (2 * Math.PI * index) / orbit.length - Math.PI / 2
    positions.set(node.id, {
      x: CX + R * Math.cos(angle),
      y: CY + R * Math.sin(angle),
    })
  })

  return (
    <svg
      viewBox="0 0 400 340"
      role="img"
      aria-label="Mind map of the source material"
      className="w-full"
    >
      {edges.map((edge, index) => {
        const from = positions.get(edge.source)
        const to = positions.get(edge.target)
        if (!from || !to) return null
        return (
          <line
            key={index}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="currentColor"
            strokeOpacity={0.2}
            strokeWidth={1.5}
          />
        )
      })}
      {nodes.map((node) => {
        const pos = positions.get(node.id)
        if (!pos) return null
        const isCenter = node.id === center.id
        return (
          <g key={node.id}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={isCenter ? 34 : 30}
              className={cn(
                "fill-background stroke-border",
                isCenter && "fill-primary/10 stroke-primary/40"
              )}
              strokeWidth={1.5}
            />
            <text
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-foreground text-[9px] leading-tight"
            >
              {node.label.length > 34
                ? `${node.label.slice(0, 32)}…`
                : node.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}