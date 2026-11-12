import sanitize from 'sanitize-html';

/**
 * Allowlist that mirrors what the editor can render. Anything else is stripped before storage,
 * because shared documents are rendered in other users' browsers (stored XSS protection).
 */
const SANITIZE_OPTIONS: sanitize.IOptions = {
  allowedTags: [
    'p', 'br', 'h1', 'h2', 'h3',
    'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote', 'hr',
    'ul', 'ol', 'li', 'a',
    // Block wrapper used by the Mermaid diagram node.
    'div',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    div: ['data-type', 'data-source'],
    ol: ['start'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    // Normalize equivalent tags produced by importers (e.g. .docx) to what the editor uses.
    b: 'strong',
    i: 'em',
    h4: 'h3',
    h5: 'h3',
    h6: 'h3',
    a: sanitize.simpleTransform('a', { rel: 'noopener noreferrer nofollow', target: '_blank' }),
  },
};

export function sanitizeDocumentHtml(html: string): string {
  return sanitize(html, SANITIZE_OPTIONS).trim();
}
