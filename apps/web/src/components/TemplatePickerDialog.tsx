import { ClipboardList, FileCode2, FileText, Presentation, Siren, TrendingUp, type LucideIcon } from 'lucide-react';
import { useTemplates } from '../hooks/use-documents';
import { Dialog } from './Dialog';

// Icons are presentation-only, so they live in the UI rather than in the API's template catalog.
const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  'feature-spec': ClipboardList,
  'technical-design': FileCode2,
  'client-feature-presentation': Presentation,
  'status-update': TrendingUp,
  'incident-postmortem': Siren,
};

interface TemplatePickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPick: (templateId: string) => void;
  isCreating: boolean;
}

export function TemplatePickerDialog({ isOpen, onClose, onPick, isCreating }: TemplatePickerDialogProps) {
  const templates = useTemplates({ enabled: isOpen });

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Start from a template"
      description="Structured starting points for the documents your team writes every week."
    >
      {templates.isPending && <p className="py-6 text-center text-sm text-ink-muted">Loading templates…</p>}
      {templates.isError && <p className="py-6 text-center text-sm text-danger">{templates.error.message}</p>}
      {templates.data && (
        <ul className="-mx-2 max-h-[60vh] space-y-1 overflow-y-auto">
          {templates.data.templates.map((template) => {
            const Icon = TEMPLATE_ICONS[template.id] ?? FileText;
            return (
              <li key={template.id}>
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={() => onPick(template.id)}
                  className="flex w-full items-start gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-canvas disabled:opacity-60"
                >
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-medium">{template.name}</span>
                      <span className="text-xs text-ink-faint">for {template.audience.toLowerCase()}</span>
                    </span>
                    <span className="mt-0.5 block text-sm text-ink-muted">{template.description}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Dialog>
  );
}
