import { AlertTriangle } from 'lucide-react';

interface DiagramPreviewProps {
  svg: string | undefined;
  error: string | undefined;
  isRendering: boolean;
}

export function DiagramPreview({ svg, error, isRendering }: DiagramPreviewProps) {
  if (error) {
    return (
      <div role="alert" className="flex max-w-full items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0">
          <span className="block font-medium">This diagram has a syntax error</span>
          <span className="block whitespace-pre-wrap break-words font-mono text-xs">{error}</span>
        </span>
      </div>
    );
  }
  if (isRendering || !svg) {
    return <span className="text-sm text-ink-muted">Rendering diagram…</span>;
  }
  // Mermaid output is generated with securityLevel "strict", which sanitizes all labels.
  return <div className="mermaid-diagram max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}
