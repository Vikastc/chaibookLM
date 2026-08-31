const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:8080")

/** Field-level validation errors, mirroring the server's zod `fieldErrors` shape. */
export type ApiFieldErrors = Record<string, string[] | undefined>

export class ApiError extends Error {
  readonly status: number
  readonly details?: ApiFieldErrors

  constructor(status: number, message: string, details?: ApiFieldErrors) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
  }

  /** First validation message for a given field, if present. */
  fieldError(field: string): string | undefined {
    return this.details?.[field]?.[0]
  }
}

async function parseErrorResponse(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as {
      error?: string
      details?: ApiFieldErrors
    }
    return new ApiError(
      res.status,
      body.error ?? `Request failed (${res.status})`,
      body.details
    )
  } catch {
    return new ApiError(res.status, `Request failed (${res.status})`)
  }
}

const REQUEST_TIMEOUT_MS = 15_000

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    const isFormData = init?.body instanceof FormData
    // Abort the request if the caller cancels (e.g. React Query unmounts the
    // query) or if the server doesn't respond within the timeout.
    const signal = AbortSignal.any([
      AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ...(init?.signal ? [init.signal] : []),
    ])
    res = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      ...init,
      signal,
      headers: {
        // FormData sets its own multipart boundary — don't override it.
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...init?.headers,
      },
    })
  } catch (err) {
    // Let cancellations propagate so React Query can handle them.
    if (err instanceof DOMException && err.name === "AbortError") throw err
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new ApiError(0, "The server took too long to respond.")
    }
    throw new ApiError(0, "Couldn't reach the server. Is it running?")
  }

  if (!res.ok) throw await parseErrorResponse(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) =>
    request<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  postForm: <T>(path: string, body: FormData) =>
    request<T>(path, { method: "POST", body }),
}
