import { describe, expect, it } from 'vitest';
import { BOLD_AND_PLAIN_PARAGRAPH_XML, buildDocx } from '../../../test/fixtures/build-docx.js';
import { convertFileToHtml, plainTextToHtml, titleFromFileName } from './file-to-html.js';

describe('convertFileToHtml', () => {
  it('turns plain text paragraphs into escaped HTML paragraphs', async () => {
    const result = await convertFileToHtml('notes.txt', Buffer.from('Hello <team>\nsecond line\n\nNew paragraph'));

    expect(result).toEqual({
      title: 'notes',
      html: '<p>Hello &lt;team&gt;<br>second line</p><p>New paragraph</p>',
    });
  });

  it('converts Markdown headings, emphasis and lists', async () => {
    const markdown = '# Plan\n\n**Bold** and *italic*\n\n- one\n- two\n\n1. first';
    const { html } = await convertFileToHtml('plan.md', Buffer.from(markdown));

    expect(html).toContain('<h1>Plan</h1>');
    expect(html).toContain('<strong>Bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<ol>');
  });

  it('converts a .docx file keeping bold text', async () => {
    const docx = await buildDocx(BOLD_AND_PLAIN_PARAGRAPH_XML);

    const result = await convertFileToHtml('Release Notes.docx', docx);

    expect(result).toEqual({ title: 'Release Notes', html: '<p><strong>Release </strong>notes</p>' });
  });

  it('rejects unsupported extensions with 415', async () => {
    await expect(convertFileToHtml('slides.pdf', Buffer.from('%PDF'))).rejects.toMatchObject({ statusCode: 415 });
  });

  it('rejects empty files with 400', async () => {
    await expect(convertFileToHtml('empty.md', Buffer.alloc(0))).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects a corrupted .docx with 400 instead of crashing', async () => {
    await expect(convertFileToHtml('broken.docx', Buffer.from('not a zip'))).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe('plainTextToHtml', () => {
  it('ignores leading, trailing and repeated blank lines', () => {
    expect(plainTextToHtml('\n\nfirst\n\n\n\nsecond\n')).toBe('<p>first</p><p>second</p>');
  });
});

describe('titleFromFileName', () => {
  it('falls back to a default when the name before the extension is blank', () => {
    expect(titleFromFileName('   .md')).toBe('Imported document');
  });
});
