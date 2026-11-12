import { and, eq } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { teamMembers, teams } from '../../db/schema.js';
import { notFound } from '../../lib/errors.js';

export const TEAM_NOT_FOUND_MESSAGE = 'Team not found or you are not a member of it.';

/**
 * Loads a team the user belongs to. Teams the user is not in produce the same 404 as missing ones,
 * so team ids never reveal which teams exist.
 */
export async function loadMemberTeam(db: Database, userId: string, teamId: string) {
  const [team] = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .innerJoin(teamMembers, and(eq(teamMembers.teamId, teams.id), eq(teamMembers.userId, userId)))
    .where(eq(teams.id, teamId));

  if (!team) {
    throw notFound(TEAM_NOT_FOUND_MESSAGE);
  }
  return team;
}
