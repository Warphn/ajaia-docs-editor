import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from '../api/client';
import type { DocumentDetail } from '../api/types';
import { AUTOSAVE_DELAY_MS, useDocumentAutosave } from './use-document-autosave';

const DOCUMENT_ID = '7f1c2a9e-1111-4c4c-9999-000000000001';

function savedDocument(version: number): DocumentDetail {
  return {
    id: DOCUMENT_ID,
    title: 'Spec',
    access: 'owner',
    owner: { id: 'owner', email: 'alice@ajaia.dev', name: 'Alice Martins' },
    contentHtml: '',
    version,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

async function advancePastDebounce() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS + 1);
  });
}

describe('useDocumentAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('batches rapid edits into one save that carries the current version', async () => {
    const updateDocument = vi.spyOn(api, 'updateDocument').mockResolvedValue(savedDocument(4));
    const { result } = renderHook(() => useDocumentAutosave({ documentId: DOCUMENT_ID, initialVersion: 3 }));

    act(() => {
      result.current.queueChange({ contentHtml: '<p>H</p>' });
      result.current.queueChange({ contentHtml: '<p>Hello</p>' });
      result.current.queueChange({ title: 'Spec' });
    });
    expect(result.current.status).toBe('unsaved');
    expect(updateDocument).not.toHaveBeenCalled();

    await advancePastDebounce();

    expect(updateDocument).toHaveBeenCalledTimes(1);
    expect(updateDocument).toHaveBeenCalledWith(DOCUMENT_ID, { contentHtml: '<p>Hello</p>', title: 'Spec', version: 3 });
    expect(result.current.status).toBe('saved');
  });

  it('uses the version returned by the previous save for the next one', async () => {
    const updateDocument = vi
      .spyOn(api, 'updateDocument')
      .mockResolvedValueOnce(savedDocument(2))
      .mockResolvedValueOnce(savedDocument(3));
    const { result } = renderHook(() => useDocumentAutosave({ documentId: DOCUMENT_ID, initialVersion: 1 }));

    act(() => result.current.queueChange({ contentHtml: '<p>one</p>' }));
    await advancePastDebounce();
    act(() => result.current.queueChange({ contentHtml: '<p>two</p>' }));
    await advancePastDebounce();

    expect(updateDocument).toHaveBeenLastCalledWith(DOCUMENT_ID, { contentHtml: '<p>two</p>', version: 2 });
  });

  it('stops autosaving and reports a conflict when the server returns 409', async () => {
    const updateDocument = vi
      .spyOn(api, 'updateDocument')
      .mockRejectedValue(new ApiError(409, 'CONFLICT', 'Changed by someone else'));
    const { result } = renderHook(() => useDocumentAutosave({ documentId: DOCUMENT_ID, initialVersion: 1 }));

    act(() => result.current.queueChange({ contentHtml: '<p>mine</p>' }));
    await advancePastDebounce();
    expect(result.current.status).toBe('conflict');

    act(() => result.current.queueChange({ contentHtml: '<p>more</p>' }));
    await advancePastDebounce();

    expect(updateDocument).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('conflict');
  });

  it('reports a retryable error and keeps the unsaved changes on network failure', async () => {
    const updateDocument = vi
      .spyOn(api, 'updateDocument')
      .mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server.'))
      .mockResolvedValueOnce(savedDocument(2));
    const { result } = renderHook(() => useDocumentAutosave({ documentId: DOCUMENT_ID, initialVersion: 1 }));

    act(() => result.current.queueChange({ contentHtml: '<p>draft</p>' }));
    await advancePastDebounce();
    expect(result.current.status).toBe('error');
    expect(result.current.errorMessage).toBe('Could not reach the server.');

    await act(() => result.current.saveNow());

    expect(updateDocument).toHaveBeenLastCalledWith(DOCUMENT_ID, { contentHtml: '<p>draft</p>', version: 1 });
    expect(result.current.status).toBe('saved');
  });
});
