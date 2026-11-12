import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { currentUserId, sessionSecurity } from '../../lib/authentication.js';
import { errorResponseSchema } from '../../lib/errors.js';
import { documentSummarySchema } from '../documents/document.schemas.js';
import type { DocumentsService } from '../documents/documents.service.js';
import { addTeamMemberBodySchema, createTeamBodySchema, teamIdParamsSchema, teamSchema } from './team.schemas.js';
import type { TeamsService } from './teams.service.js';

interface TeamsRoutesOptions {
  teamsService: TeamsService;
  documentsService: DocumentsService;
}

export const teamsRoutes: FastifyPluginAsyncZod<TeamsRoutesOptions> = async (app, options) => {
  const { teamsService, documentsService } = options;
  app.addHook('preHandler', app.authenticate);

  app.get(
    '/api/teams',
    {
      schema: {
        tags: ['teams'],
        summary: 'List the teams I belong to',
        security: sessionSecurity,
        response: { 200: z.object({ teams: z.array(teamSchema) }), 401: errorResponseSchema },
      },
    },
    async (request) => ({ teams: await teamsService.listTeams(currentUserId(request)) }),
  );

  app.post(
    '/api/teams',
    {
      schema: {
        tags: ['teams'],
        summary: 'Create a team',
        description: 'The signed-in user becomes its first member.',
        security: sessionSecurity,
        body: createTeamBodySchema,
        response: { 201: teamSchema, 400: errorResponseSchema, 401: errorResponseSchema },
      },
    },
    async (request, reply) => {
      const team = await teamsService.createTeam(currentUserId(request), request.body);
      return reply.status(201).send(team);
    },
  );

  app.post(
    '/api/teams/:teamId/members',
    {
      schema: {
        tags: ['teams'],
        summary: 'Add a member to a team',
        description:
          'Any member can add a colleague by email. Members can open and edit every document of the team. ' +
          '404 when the team does not exist, the caller is not a member, or no user has that email.',
        security: sessionSecurity,
        params: teamIdParamsSchema,
        body: addTeamMemberBodySchema,
        response: { 200: teamSchema, 400: errorResponseSchema, 401: errorResponseSchema, 404: errorResponseSchema },
      },
    },
    async (request) => teamsService.addMember(currentUserId(request), request.params.teamId, request.body),
  );

  app.get(
    '/api/teams/:teamId/documents',
    {
      schema: {
        tags: ['teams'],
        summary: 'List the documents of a team',
        description: 'Members only (404 otherwise). Most recently edited first.',
        security: sessionSecurity,
        params: teamIdParamsSchema,
        response: {
          200: z.object({ documents: z.array(documentSummarySchema) }),
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => ({
      documents: await documentsService.listForTeam(currentUserId(request), request.params.teamId),
    }),
  );
};
