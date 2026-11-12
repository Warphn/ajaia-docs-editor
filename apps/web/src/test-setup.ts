import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Without vitest globals, Testing Library cannot register its automatic cleanup between tests.
afterEach(cleanup);

// jsdom does not implement modal <dialog>; the app's Dialog component relies on showModal/close.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}
