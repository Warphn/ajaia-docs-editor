import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ExportMenu } from './ExportMenu';

function renderMenu() {
  const onExportPdf = vi.fn();
  const onExportMarkdown = vi.fn();
  render(<ExportMenu onExportPdf={onExportPdf} onExportMarkdown={onExportMarkdown} />);
  return { onExportPdf, onExportMarkdown };
}

describe('ExportMenu', () => {
  it('runs the chosen export and closes the menu', async () => {
    const { onExportPdf, onExportMarkdown } = renderMenu();

    await userEvent.click(screen.getByRole('button', { name: 'Export' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Markdown (.md)' }));

    expect(onExportMarkdown).toHaveBeenCalledOnce();
    expect(onExportPdf).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes on Escape without exporting', async () => {
    const { onExportPdf, onExportMarkdown } = renderMenu();

    await userEvent.click(screen.getByRole('button', { name: 'Export' }));
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).toBeNull();
    expect(onExportPdf).not.toHaveBeenCalled();
    expect(onExportMarkdown).not.toHaveBeenCalled();
  });
});
