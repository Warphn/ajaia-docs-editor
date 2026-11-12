import { describe, expect, it } from 'vitest';
import { documentHtmlToMarkdown, markdownFileName } from './export-markdown';

describe('documentHtmlToMarkdown', () => {
  it('converts headings, paragraphs and inline formatting', () => {
    const html =
      '<h1>Release plan</h1><p>Ship <strong>today</strong>, <em>maybe</em> <s>tomorrow</s>, with <code>npm test</code>.</p>';

    expect(documentHtmlToMarkdown(html)).toBe(
      '# Release plan\n\nShip **today**, _maybe_ ~~tomorrow~~, with `npm test`.',
    );
  });

  it('keeps underline as inline HTML because Markdown has no underline syntax', () => {
    expect(documentHtmlToMarkdown('<p><u>Important</u></p>')).toBe('<u>Important</u>');
  });

  it('converts the editor lists (paragraphs inside list items) with a single space after the marker', () => {
    const html =
      '<ul><li><p>First</p></li><li><p>Second</p></li></ul><ol><li><p>One</p></li><li><p>Two</p></li></ol>';

    expect(documentHtmlToMarkdown(html)).toBe('- First\n- Second\n\n1. One\n2. Two');
  });

  it('indents nested lists under their parent item', () => {
    const html = '<ul><li><p>Parent</p><ul><li><p>Child</p></li></ul></li><li><p>Sibling</p></li></ul>';

    expect(documentHtmlToMarkdown(html)).toBe('- Parent\n  - Child\n- Sibling');
  });

  it('turns Mermaid diagrams back into mermaid fences, the format the importer reads', () => {
    const html = '<p>Flow:</p><div data-type="mermaid" data-source="graph TD\n  A --&gt; B"></div>';

    expect(documentHtmlToMarkdown(html)).toBe('Flow:\n\n```mermaid\ngraph TD\n  A --> B\n```');
  });

  it('keeps code blocks fenced with their language', () => {
    const html = '<pre><code class="language-ts">const answer = 42;</code></pre>';

    expect(documentHtmlToMarkdown(html)).toBe('```ts\nconst answer = 42;\n```');
  });

  it('converts links, quotes, rules and images', () => {
    const html =
      '<blockquote><p>Quoted</p></blockquote><hr><p><a href="https://ajaia.dev">Site</a></p>' +
      '<img src="data:image/svg+xml;base64,PHN2Zy8+" alt="Drawing">';

    expect(documentHtmlToMarkdown(html)).toBe(
      '> Quoted\n\n---\n\n[Site](https://ajaia.dev)\n\n![Drawing](data:image/svg+xml;base64,PHN2Zy8+)',
    );
  });

  it('drops font wrappers but keeps their text', () => {
    expect(documentHtmlToMarkdown('<p><span style="font-family: Georgia">Serif text</span></p>')).toBe('Serif text');
  });
});

describe('markdownFileName', () => {
  it('uses the document title with a .md extension', () => {
    expect(markdownFileName('Release plan')).toBe('Release plan.md');
  });

  it('removes characters that are not allowed in file names', () => {
    expect(markdownFileName('RFC: <title> / v2?')).toBe('RFC title v2.md');
  });

  it('falls back to a generic name when nothing usable is left', () => {
    expect(markdownFileName('  ???  ')).toBe('Untitled document.md');
  });
});
