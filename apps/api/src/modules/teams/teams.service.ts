import { asc, eq, inArray } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { teamMembers, teams, users } from '../../db/schema.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { normalizeEmail, type PublicUser } from '../users/user.schemas.js';
import { loadMemberTeam } from './team-membership.js';
import type { Team } from './team.schemas.js';

export function createTeamsService(db: Database) {
  /** Teams the user belongs to, with their members, sorted by name. */
  async function listTeams(userId: string): Promise<Team[]> {
    const memberships = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));
    const teamIds = memberships.map((membership) => membership.teamId);
    if (teamIds.length === 0) {
      return [];
    }

    const teamRows = await db.select().from(teams).where(inArray(teams.id, teamIds)).orderBy(asc(teams.name));
    const memberRows = await db
      .select({ teamId: teamMembers.teamId, user: { id: users.id, email: users.email, name: users.name } })
      .from(teamMembers)
      .innerJoin(users, eq(users.id, teamMembers.userId))
      .where(inArray(teamMembers.teamId, teamIds))
      .orderBy(asc(users.name));

    return teamRows.map((team) => ({
      id: team.id,
      name: team.name,
      members: memberRows.filter((row) => row.teamId === team.id).map((row) => row.user),
    }));
  }

  /** Creates a team with the creator as its first member. */
  async function createTeam(userId: string, input: { name: string }): Promise<Team> {
    const [team] = await db.insert(teams).values({ name: input.name, createdBy: userId }).returning();
    await db.insert(teamMembers).values({ teamId: team!.id, userId });
    return getTeam(userId, team!.id);
  }

  /** Any member can bring a colleague in (lightweight, like a chat channel). */
  async function addMember(userId: string, teamId: string, input: { email: string }): Promise<Team> {
    await loadMemberTeam(db, userId, teamId);

    const [newMember] = await db.select().from(users).where(eq(users.email, normalizeEmail(input.email)));
    if (!newMember) {
      throw notFound(`No user found with email "${input.email}".`);
    }

    const inserted = await db
      .insert(teamMembers)
      .values({ teamId, userId: newMember.id })
      .onConflictDoNothing()
      .returning({ userId: teamMembers.userId });
    if (inserted.length === 0) {
      throw badRequest(`${newMember.name} is already in this team.`);
    }
    return getTeam(userId, teamId);
  }

  async function getTeam(userId: string, teamId: string): Promise<Team> {
    const team = await loadMemberTeam(db, userId, teamId);
    const members: PublicUser[] = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(teamMembers)
      .innerJoin(users, eq(users.id, teamMembers.userId))
      .where(eq(teamMembers.teamId, teamId))
      .orderBy(asc(users.name));
    return { ...team, members };
  }

  return { listTeams, createTeam, addMember };
}

export type TeamsService = ReturnType<typeof createTeamsService>;
