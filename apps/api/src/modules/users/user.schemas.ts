import { z } from 'zod';
import type { User } from '../../db/schema.js';

export const publicUserSchema = z
  .object({
    id: z.uuid(),
    email: z.email(),
    name: z.string(),
  })
  .describe('User without sensitive fields');

export type PublicUser = z.infer<typeof publicUserSchema>;

export function toPublicUser(user: Pick<User, 'id' | 'email' | 'name'>): PublicUser {
  return { id: user.id, email: user.email, name: user.name };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
