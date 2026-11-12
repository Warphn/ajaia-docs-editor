import { describe, expect, it } from 'vitest';
import { sanitizeDocumentHtml } from '../../lib/sanitize-html.js';
import { MAX_TITLE_LENGTH } from '../documents/document.schemas.js';
import { DOCUMENT_TEMPLATES, findTemplate } from './template-catalog.js';

describe('template catalog', () => {
  it('has unique ids', () => {
    const templateIds = DOCUMENT_TEMPLATES.map((template) => template.id);

    expect(new Set(templateIds).size).toBe(templateIds.length);
  });

  it.each(DOCUMENT_TEMPLATES.map((template) => [template.id, template] as const))(
    '"%s" only uses markup the editor supports (unchanged by the sanitizer)',
    (_templateId, template) => {
      expect(sanitizeDocumentHtml(template.contentHtml)).toBe(template.contentHtml);
    },
  );

  it('gives every template a valid default title', () => {
    for (const template of DOCUMENT_TEMPLATES) {
      expect(template.defaultTitle.trim().length).toBeGreaterThan(0);
      expect(template.defaultTitle.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
    }
  });

  it('finds templates by id and returns undefined for unknown ids', () => {
    expect(findTemplate('feature-spec')?.name).toBe('Feature spec');
    expect(findTemplate('does-not-exist')).toBeUndefined();
  });
});
