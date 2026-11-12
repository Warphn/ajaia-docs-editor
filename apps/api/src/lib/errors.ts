import { z } from 'zod';

/**
 * Error with an HTTP status and a stable machine-readable code.
 * Thrown from services and translated into a JSON response by the app error handler.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string) => new AppError(400, 'BAD_REQUEST', message);
export const unauthorized = (message = 'You must be signed in.') =>
  new AppError(401, 'UNAUTHORIZED', message);
export const forbidden = (message: string) => new AppError(403, 'FORBIDDEN', message);
export const notFound = (message: string) => new AppError(404, 'NOT_FOUND', message);
export const conflict = (message: string) => new AppError(409, 'CONFLICT', message);
export const unsupportedMediaType = (message: string) =>
  new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', message);

export const errorResponseSchema = z
  .object({
    error: z.string().describe('Stable machine-readable error code'),
    message: z.string().describe('Human-readable explanation'),
  })
  .describe('Error response');

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
