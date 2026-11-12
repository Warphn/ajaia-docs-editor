import { describe, expect, it } from 'vitest';
import {
  gridBackgroundStyle,
  movePage,
  PAGE_WIDTH,
  pageScreenTransform,
  viewportCenteredOnPage,
} from './page-geometry';
import { collectElementsForExport, sceneFingerprint, type SceneElement } from './scene-helpers';

describe('page geometry', () => {
  it('places the page like Excalidraw places elements: (position + scroll) × zoom', () => {
    expect(pageScreenTransform({ x: 100, y: 50 }, { scrollX: 20, scrollY: -10, zoom: 2 })).toEqual({
      left: 240,
      top: 80,
      scale: 2,
    });
  });

  it('moves the page by the pointer distance divided by zoom', () => {
    expect(movePage({ x: 0, y: 0 }, { x: 100, y: -50 }, 2)).toEqual({ x: 50, y: -25 });
  });

  it('centers the page horizontally at zoom 1 when resetting the view', () => {
    const viewport = viewportCenteredOnPage({ x: 0, y: 0 }, 1216);
    const placement = pageScreenTransform({ x: 0, y: 0 }, viewport);

    expect(viewport.zoom).toBe(1);
    expect(placement.left).toBe((1216 - PAGE_WIDTH) / 2);
    expect(placement.top).toBeGreaterThan(0);
  });

  it('scales and offsets the dotted background with the canvas', () => {
    expect(gridBackgroundStyle({ scrollX: 10, scrollY: 5, zoom: 2 })).toEqual({
      backgroundSize: '40px 40px',
      backgroundPosition: '20px 10px',
    });
  });
});

describe('collectElementsForExport', () => {
  const elements: SceneElement[] = [
    { id: 'box', version: 1 },
    { id: 'box-label', version: 1, containerId: 'box' },
    { id: 'grouped-a', version: 1, groupIds: ['group-1'] },
    { id: 'grouped-b', version: 1, groupIds: ['group-1'] },
    { id: 'unrelated', version: 1 },
    { id: 'deleted', version: 2, isDeleted: true },
  ];

  it('includes the text bound inside a selected shape', () => {
    const exported = collectElementsForExport(elements, { box: true });

    expect(exported.map((element) => element.id)).toEqual(['box', 'box-label']);
  });

  it('includes every member of a selected group and nothing else', () => {
    const exported = collectElementsForExport(elements, { 'grouped-a': true });

    expect(exported.map((element) => element.id)).toEqual(['grouped-a', 'grouped-b']);
  });

  it('never exports deleted elements', () => {
    expect(collectElementsForExport(elements, { deleted: true })).toEqual([]);
  });
});

describe('sceneFingerprint', () => {
  const position = { x: 0, y: 0 };

  it('stays the same when only non-persistent state changes', () => {
    const before = sceneFingerprint([{ id: 'a', version: 3 }], ['file-1'], position);
    const after = sceneFingerprint([{ id: 'a', version: 3 }], ['file-1'], { ...position });

    expect(after).toBe(before);
  });

  it('changes when an element is edited, a file is added or the page moves', () => {
    const base = sceneFingerprint([{ id: 'a', version: 3 }], [], position);

    expect(sceneFingerprint([{ id: 'a', version: 4 }], [], position)).not.toBe(base);
    expect(sceneFingerprint([{ id: 'a', version: 3 }], ['file-1'], position)).not.toBe(base);
    expect(sceneFingerprint([{ id: 'a', version: 3 }], [], { x: 10, y: 0 })).not.toBe(base);
  });

  it('ignores deleted elements', () => {
    expect(sceneFingerprint([{ id: 'a', version: 1, isDeleted: true }], [], position)).toBe(
      sceneFingerprint([], [], position),
    );
  });
});
