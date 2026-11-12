import sanitize from 'sanitize-html';

/**
 * Images are only accepted as embedded data URIs of image types: drawings exported from the canvas
 * (SVG) and pictures from imported .docx files. Remote URLs are rejected (no tracking pixels, no
 * broken links in exports), and SVG inside <img> cannot execute scripts.
 */
const EMBEDDED_IMAGE_SOURCE = /^data:image\/(png|jpeg|gif|webp|svg\+xml)[;,]/i;

/**
 * Allowlist that mirrors what the editor can render. Anything else is stripped before storage,
 * because shared documents are rendered in other users' browsers (stored XSS protection).
 */
const SANITIZE_OPTIONS: sanitize.IOptions = {
  allowedTags: [
    'p', 'br', 'h1', 'h2', 'h3',
    'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote', 'hr',
    'ul', 'ol', 'li', 'a', 'img',
    // Block wrapper used by the Mermaid diagram node.
    'div',
    // Inline wrapper carrying the font family chosen in the editor.
    'span',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    div: ['data-type', 'data-source'],
    // data-drawing-id links an included drawing to its source on the canvas (include/remove toggle).
    img: ['src', 'alt', 'title', 'data-drawing-id'],
    ol: ['start'],
    span: ['style'],
  },
  // Only font names are allowed in styles: letters, digits, spaces, commas, quotes and hyphens
  // (no url(), no semicolons), so a style attribute cannot load resources or inject other CSS.
  allowedStyles: {
    span: { 'font-family': [/^[\w\s,'"-]+$/] },
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['data'] },
  transformTags: {
    // Normalize equivalent tags produced by importers (e.g. .docx) to what the editor uses.
    b: 'strong',
    i: 'em',
    h4: 'h3',
    h5: 'h3',
    h6: 'h3',
    a: sanitize.simpleTransform('a', { rel: 'noopener noreferrer nofollow', target: '_blank' }),
  },
  // Drop images whose source is missing (removed by the scheme check) or not an embedded image type.
  exclusiveFilter: (frame) => frame.tag === 'img' && !EMBEDDED_IMAGE_SOURCE.test(frame.attribs.src ?? ''),
};

export function sanitizeDocumentHtml(html: string): string {
  return sanitize(html, SANITIZE_OPTIONS).trim();
}
