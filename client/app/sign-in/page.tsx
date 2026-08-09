"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { BookOpenIcon } from "lucide-react"

import { signIn, useSession } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

const OAUTH_ERRORS: Record<string, string> = {
  access_denied: "Sign-in was cancelled.",
  oauth_callback_error: "Google couldn't complete sign-in. Please try again.",
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.98 11.98 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.97 11.97 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  )
}

function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium tracking-tight">
      <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <BookOpenIcon className="size-3.5" />
      </span>
      chaibook
    </span>
  )
}

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, isPending } = useSession()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(
    OAUTH_ERRORS[searchParams.get("error") ?? ""] ?? null
  )

  useEffect(() => {
    if (session) router.replace("/")
  }, [session, router])

  async function handleGoogleSignIn() {
    setError(null)
    setIsRedirecting(true)
    try {
      await signIn.social({
        provider: "google",
        callbackURL: "/",
        errorCallbackURL: "/sign-in",
      })
    } catch {
      setError("Couldn't reach the auth server. Is it running on port 8080?")
      setIsRedirecting(false)
    }
  }

  if (isPending || session) {
    return (
      <div className="grid min-h-svh place-items-center">
        <Spinner className="size-5 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <div className="flex flex-col">
        <header className="flex items-center justify-between p-6">
          <Link href="/" aria-label="Home">
            <Wordmark />
          </Link>
          <span className="font-mono text-[11px] tracking-wide text-muted-foreground/70">
            v0.1
          </span>
        </header>

        <main className="flex flex-1 items-center justify-center px-6 py-16">
          <div className="w-full max-w-80">
            <h1 className="text-lg font-semibold tracking-tight">
              Sign in to chaibook
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              One account for every notebook, source, and conversation.
            </p>

            <Button
              variant="outline"
              size="lg"
              className="mt-8 w-full"
              onClick={handleGoogleSignIn}
              disabled={isRedirecting}
            >
              {isRedirecting ? <Spinner /> : <GoogleMark />}
              {isRedirecting ? "Redirecting to Google…" : "Continue with Google"}
            </Button>

            {error && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {error}
              </p>
            )}

            <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
              By continuing, you agree to our{" "}
              <Link
                href="/terms"
                className="underline underline-offset-4 transition-colors hover:text-foreground"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="underline underline-offset-4 transition-colors hover:text-foreground"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </main>

        <footer className="flex items-center justify-between p-6 text-xs text-muted-foreground">
          <span>© 2026 chaibook</span>
          <a
            href="mailto:support@chaibook.app"
            className="transition-colors hover:text-foreground"
          >
            support@chaibook.app
          </a>
        </footer>
      </div>

      <aside className="relative hidden overflow-hidden border-l bg-muted/40 lg:block">
        <div
          aria-hidden="true"
          className="absolute inset-0 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:20px_20px]"
        />
        <div className="relative flex h-full flex-col justify-between p-10">
          <span className="font-mono text-[11px] tracking-wide text-muted-foreground">
            01 — READ, ASK, REMEMBER
          </span>
          <div>
            <p className="max-w-xs text-2xl leading-snug font-medium tracking-tight">
              Every source you feed it, one question away.
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Chaibook grounds every answer in the documents you upload — no
              guessing, no hallucinated citations.
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-svh place-items-center">
          <Spinner className="size-5 text-muted-foreground" />
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  )
}
