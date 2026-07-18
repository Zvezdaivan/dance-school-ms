/** Error carrying an HTTP status, thrown from services and caught by handleRoute(). */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * A business-rule violation thrown from pure lib code (dates, money, payroll
 * math). Kept separate from ApiError so lib stays HTTP-agnostic; handleRoute()
 * maps it to a 400.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

/** Unwrap a findFirst/findUnique result or throw the standard 404. */
export function orNotFound<T>(row: T | null, entity: string): T {
  if (!row) throw new ApiError(404, `${entity} not found`);
  return row;
}
