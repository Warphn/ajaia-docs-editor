import { useEffect, useState } from 'react';
import { renderMermaidDiagram, type DiagramRenderResult } from './render-mermaid';

/** Renders `source` to SVG, waiting `debounceMs` after the last change (useful while typing). */
export function useMermaidSvg(source: string, debounceMs = 0) {
  const [result, setResult] = useState<DiagramRenderResult | null>(null);

  useEffect(() => {
    let isCurrent = true;
    const timer = window.setTimeout(() => {
      void renderMermaidDiagram(source).then((renderResult) => {
        if (isCurrent) {
          setResult(renderResult);
        }
      });
    }, debounceMs);
    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [source, debounceMs]);

  return { svg: result?.svg, error: result?.error, isRendering: result === null };
}
