import fastifyMultipart from '@fastify/multipart';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { currentUserId, sessionSecurity } from '../../lib/authentication.js';
import { AppError, badRequest, errorResponseSchema } from '../../lib/errors.js';
import { documentDetailSchema } from '../documents/document.schemas.js';
import type { DocumentsService } from '../documents/documents.service.js';
import {
  assertSupportedFile,
  convertFileToHtml,
  MAX_IMPORT_FILE_BYTES,
  SUPPORTED_IMPORT_EXTENSIONS,
} from './file-to-html.js';

interface ImportsRoutesOptions {
  documentsService: DocumentsService;
}

const MAX_IMPORT_FILE_MEGABYTES = MAX_IMPORT_FILE_BYTES / (1024 * 1024);

export const importsRoutes: FastifyPluginAsyncZod<ImportsRoutesOptions> = async (app, options) => {
  const { documentsService } = options;
  await app.register(fastifyMultipart, { limits: { fileSize: MAX_IMPORT_FILE_BYTES, files: 1 } });
  app.addHook('preHandler', app.authenticate);

  app.post(
    '/api/documents/import',
    {
      schema: {
        tags: ['documents'],
        summary: 'Import a file as a new document',
        description:
          'Send `multipart/form-data` with a single field named `file`. ' +
          `Supported: ${SUPPORTED_IMPORT_EXTENSIONS.join(', ')} up to ${MAX_IMPORT_FILE_MEGABYTES} MB. ` +
          'The file name (without extension) becomes the document title; formatting such as headings, ' +
          'bold, italic and lists is preserved. Images and tables are not supported and are dropped/flattened.',
        consumes: ['multipart/form-data'],
        security: sessionSecurity,
        querystring: z.object({
          teamId: z.uuid().optional().describe('Create the document in this team; 404 if not a member'),
        }),
        response: {
          201: documentDetailSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
          413: errorResponseSchema,
          415: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const upload = await request.file();
      if (!upload) {
        throw badRequest('Attach a file in the "file" field.');
      }
      assertSupportedFile(upload.filename);

      const fileContent = await readWithinSizeLimit(() => upload.toBuffer());
      const converted = await convertFileToHtml(upload.filename, fileContent);
      const document = await documentsService.createDocument(currentUserId(request), {
        title: converted.title,
        contentHtml: converted.html,
        teamId: request.query.teamId,
      });
      return reply.status(201).send(document);
    },
  );
};

async function readWithinSizeLimit(readFile: () => Promise<Buffer>): Promise<Buffer> {
  try {
    return await readFile();
  } catch (error) {
    if ((error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') {
      throw new AppError(413, 'FILE_TOO_LARGE', `Files must be ${MAX_IMPORT_FILE_MEGABYTES} MB or smaller.`);
    }
    throw error;
  }
}
