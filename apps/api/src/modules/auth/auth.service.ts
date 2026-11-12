import { compare } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { users } from '../../db/schema.js';
import { unauthorized } from '../../lib/errors.js';
import { normalizeEmail, toPublicUser, type PublicUser } from '../users/user.schemas.js';

// Same message for unknown email and wrong password, so the API does not reveal which accounts exist.
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';

export function createAuthService(db: Database) {
  async function verifyCredentials(email: string, password: string): Promise<PublicUser> {
    const [user] = await db.select().from(users).where(eq(users.email, normalizeEmail(email)));
    if (!user || !(await compare(password, user.passwordHash))) {
      throw unauthorized(INVALID_CREDENTIALS_MESSAGE);
    }
    return toPublicUser(user);
  }

  async function getUserById(userId: string): Promise<PublicUser> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw unauthorized('Your session is no longer valid. Please sign in again.');
    }
    return toPublicUser(user);
  }

  return { verifyCredentials, getUserById };
}

export type AuthService = ReturnType<typeof createAuthService>;
