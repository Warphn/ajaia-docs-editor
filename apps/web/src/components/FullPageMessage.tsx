import { Button } from './Button';

interface FullPageMessageProps {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function FullPageMessage({ title, description, action }: FullPageMessageProps) {
  return (
    <main className="canvas-grid flex min-h-screen items-center justify-center px-4">
      <div className="max-w-sm text-center" role="status">
        <h1 className="text-lg font-semibold">{title}</h1>
        {description && <p className="mt-2 text-sm text-ink-muted">{description}</p>}
        {action && (
          <Button className="mt-5" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    </main>
  );
}
