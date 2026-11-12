import type { Mermaid } from 'mermaid';

export type DiagramRenderResult = { svg: string; error?: undefined } | { svg?: undefined; error: string };

let mermaidLoader: Promise<Mermaid> | null = null;
let renderQueue: Promise<unknown> = Promise.resolve();
let renderCount = 0;

/** Mermaid is ~1 MB, so it is only downloaded the first time a document contains a diagram. */
function loadMermaid(): Promise<Mermaid> {
  mermaidLoader ??= import('mermaid').then(({ default: mermaid }) => {
    mermaid.initialize({
      startOnLoad: false,
      // "strict" sanitizes labels and disables click handlers/scripts inside diagrams.
      securityLevel: 'strict',
      theme: 'neutral',
      fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
    });
    return mermaid;
  });
  return mermaidLoader;
}

/**
 * Renders Mermaid source to SVG, or returns a readable error for invalid syntax.
 * Renders are queued because Mermaid keeps global state and concurrent calls can interfere.
 */
export function renderMermaidDiagram(source: string): Promise<DiagramRenderResult> {
  const task = renderQueue.then(async (): Promise<DiagramRenderResult> => {
    if (!source.trim()) {
      return { error: 'The diagram is empty. Write Mermaid code, for example: flowchart LR; A --> B' };
    }
    const mermaid = await loadMermaid();
    try {
      await mermaid.parse(source);
      renderCount += 1;
      const { svg } = await mermaid.render(`mermaid-diagram-${renderCount}`, source);
      return { svg };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });
  renderQueue = task.catch(() => undefined);
  return task;
}
