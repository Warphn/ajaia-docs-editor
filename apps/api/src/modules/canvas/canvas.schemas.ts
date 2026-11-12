import { z } from 'zod';

export const MAX_CANVAS_ELEMENTS = 5_000;
/** Request size cap for canvas saves; pasted images make scenes grow quickly. */
export const MAX_CANVAS_BODY_BYTES = 5 * 1024 * 1024;

/**
 * The scene is Excalidraw's own data model, rendered only by Excalidraw (never as HTML),
 * so the API checks its overall shape and size rather than every element field.
 */
export const canvasSceneSchema = z
  .object({
    elements: z
      .array(z.record(z.string(), z.unknown()))
      .max(MAX_CANVAS_ELEMENTS)
      .describe('Excalidraw elements (shapes, arrows, text, freehand)'),
    files: z
      .record(z.string(), z.record(z.string(), z.unknown()))
      .default({})
      .describe('Images pasted into the canvas, keyed by file id'),
    pagePosition: z
      .object({ x: z.number(), y: z.number() })
      .describe('Top-left corner of the document page in canvas coordinates'),
  })
  .describe('Whiteboard around the document page');

export const canvasResponseSchema = z.object({
  scene: canvasSceneSchema.nullable().describe('null until something is drawn or the page is moved'),
});

export type CanvasScene = z.infer<typeof canvasSceneSchema>;
