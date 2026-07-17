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
