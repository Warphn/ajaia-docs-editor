import { z } from 'zod';
import { publicUserSchema } from '../users/user.schemas.js';

export const MAX_TEAM_NAME_LENGTH = 80;

export const teamIdParamsSchema = z.object({
  teamId: z.uuid().describe('Team id'),
});

export const teamSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  members: z.array(publicUserSchema).describe('Everyone in the team, sorted by name'),
});

export const createTeamBodySchema = z.object({
  name: z.string().trim().min(1, 'Team name cannot be empty.').max(MAX_TEAM_NAME_LENGTH).describe('e.g. "Mobile app"'),
});

export const addTeamMemberBodySchema = z.object({
  email: z.email().describe('Email of the user to add, e.g. bob@ajaia.dev'),
});

export type Team = z.infer<typeof teamSchema>;
