export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: unknown) {
    super(400, message, details);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(401, message);
    this.name = "UnauthorizedError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(409, message);
    this.name = "ConflictError";
  }
}

export class QuotaExceededError extends AppError {
  constructor(usage: number, limit: number) {
    super(402, "Token quota exceeded", { usage, limit });
    this.name = "QuotaExceededError";
  }
}

export class ModerationError extends AppError {
  constructor(categories: string[]) {
    super(400, "Message flagged by content policy", { categories });
    this.name = "ModerationError";
  }
}
