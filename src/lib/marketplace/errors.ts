/**
 * Expected business-rule failures of marketplace operations (request closed,
 * offer already selected, contract already signed…). Mapped to HTTP status
 * codes by `mapError` and to user-facing messages by Server Actions. Anything
 * else is an unexpected error and is logged, never shown.
 */
export class DomainError extends Error {
  readonly status: 400 | 404 | 409;

  constructor(message: string, status: 400 | 404 | 409 = 409) {
    super(message);
    this.name = 'DomainError';
    this.status = status;
  }
}
