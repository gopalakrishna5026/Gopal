export type AppErrorCode =
  | "DUPLICATE"
  | "NOT_FOUND"
  | "INVALID"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INSUFFICIENT_AVAILABILITY"
  | "AVAILABILITY_CHANGED"
  | "PAYMENT_FAILED"
  | "NOT_CANCELLABLE";

export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error && error.name === "ConstraintError") {
    return "A record with the same unique value already exists.";
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
