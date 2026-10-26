import type { ApiError } from '@stacks/shared';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new AppError(404, 'not_found', `${what} not found.`);

export function zodToApiError(error: ZodError): ApiError {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    fields[key] ??= issue.message;
  }
  return { error: { code: 'invalid_request', message: 'Some fields need attention.', fields } };
}
