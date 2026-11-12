import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

function renderDialog(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      isOpen
      title="Delete document?"
      confirmLabel="Delete"
      pendingLabel="Deleting…"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    >
      Everyone it is shared with will lose access too.
    </ConfirmDialog>,
  );
  return { onConfirm, onCancel };
}

describe('ConfirmDialog', () => {
  it('runs the action only when the confirm button is clicked', async () => {
    const { onConfirm, onCancel } = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('cancels without running the action', async () => {
    const { onConfirm, onCancel } = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('disables both buttons and shows the pending label while the action runs', () => {
    renderDialog({ isPending: true });

    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Deleting…' }).disabled).toBe(true);
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Cancel' }).disabled).toBe(true);
  });

  it('shows the error message when the action fails', () => {
    renderDialog({ errorMessage: 'Document not found' });

    expect(screen.getByRole('alert').textContent).toBe('Document not found');
  });
});
