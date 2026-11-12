import { describe, expect, it } from 'vitest';
import { sanitizeDocumentHtml } from './sanitize-html.js';

describe('sanitizeDocumentHtml', () => {
  it('keeps every formatting the editor supports', () => {
    const html =
      '<h1>Title</h1><h2>Sub</h2><h3>Small</h3>' +
      '<p><strong>bold</strong> <em>italic</em> <u>underline</u></p>' +
      '<ul><li>bullet</li></ul><ol><li>number</li></ol>';

    expect(sanitizeDocumentHtml(html)).toBe(html);
  });

  it('removes scripts and inline event handlers', () => {
    const html = '<p onclick="steal()">Hello</p><script>alert(1)</script><img src=x onerror="alert(1)">';

    expect(sanitizeDocumentHtml(html)).toBe('<p>Hello</p>');
  });

  it('drops javascript: links but keeps safe ones with protective rel attributes', () => {
    expect(sanitizeDocumentHtml('<a href="javascript:alert(1)">bad</a>')).toBe('<a rel="noopener noreferrer nofollow" target="_blank">bad</a>');
    expect(sanitizeDocumentHtml('<a href="https://ajaia.dev">ok</a>')).toBe(
      '<a href="https://ajaia.dev" rel="noopener noreferrer nofollow" target="_blank">ok</a>',
    );
  });

  it('normalizes equivalent tags produced by imported files', () => {
    expect(sanitizeDocumentHtml('<b>a</b><i>b</i><h5>c</h5>')).toBe('<strong>a</strong><em>b</em><h3>c</h3>');
  });

  it('keeps diagram blocks with only their data attributes', () => {
    const html = '<div data-type="mermaid" data-source="graph TD; A--&gt;B" style="color:red">x</div>';

    expect(sanitizeDocumentHtml(html)).toBe('<div data-type="mermaid" data-source="graph TD; A--&gt;B">x</div>');
  });

  it('keeps embedded SVG and PNG images (canvas drawings, .docx pictures)', () => {
    const svgImage = '<p><img src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" alt="Drawing" /></p>';
    const pngImage = '<p><img src="data:image/png;base64,iVBORw0KGgo=" /></p>';

    expect(sanitizeDocumentHtml(svgImage)).toBe(svgImage);
    expect(sanitizeDocumentHtml(pngImage)).toBe(pngImage);
  });

  it('removes images with remote, HTML or script sources', () => {
    const html =
      '<p>a<img src="https://tracker.example/pixel.png" />' +
      '<img src="data:text/html;base64,PHNjcmlwdD4=" />' +
      '<img src="javascript:alert(1)" />' +
      '<img onerror="alert(1)" />b</p>';

    expect(sanitizeDocumentHtml(html)).toBe('<p>ab</p>');
  });

  it('keeps the font family chosen in the editor and nothing else in styles', () => {
    expect(sanitizeDocumentHtml('<p><span style="font-family: Arial, Helvetica, sans-serif">a</span></p>')).toBe(
      '<p><span style="font-family:Arial, Helvetica, sans-serif">a</span></p>',
    );
    expect(sanitizeDocumentHtml(`<p><span style="font-family: 'Times New Roman', serif; color: red">b</span></p>`)).toBe(
      `<p><span style="font-family:'Times New Roman', serif">b</span></p>`,
    );
  });

  it('drops styles that could load resources or inject CSS', () => {
    const html = '<p><span style="font-family: x; background: url(https://evil.example/a.png)">c</span></p>';

    expect(sanitizeDocumentHtml(html)).toBe('<p><span style="font-family:x">c</span></p>');
    expect(sanitizeDocumentHtml('<p><span style="font-family: url(x)">d</span></p>')).toBe('<p><span>d</span></p>');
  });

  it('keeps the canvas link on included drawings', () => {
    const html = '<p><img src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" data-drawing-id="d-1" /></p>';

    expect(sanitizeDocumentHtml(html)).toBe(html);
  });

  it('preserves multi-line diagram source with quotes intact', () => {
    const html = '<div data-type="mermaid" data-source="erDiagram\n  DOC ||--o{ SHARE : &quot;shared via&quot;"></div>';

    expect(sanitizeDocumentHtml(html)).toBe(html);
  });
});
