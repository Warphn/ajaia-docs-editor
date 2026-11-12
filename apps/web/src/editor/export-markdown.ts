import TurndownService from 'turndown';

const FALLBACK_FILE_NAME = 'Untitled document';
// Characters Windows, macOS or Linux reject in file names, plus control characters.
const INVALID_FILE_NAME_CHARACTERS = /[\\/:*?"<>|\u0000-\u001f]/g;

function isMermaidDiagram(node: HTMLElement) {
  return node.nodeName === 'DIV' && node.getAttribute('data-type') === 'mermaid';
}

// Same format the .md importer turns into diagram blocks, so an export can be imported back.
function mermaidFence(node: HTMLElement) {
  const source = node.getAttribute('data-source') ?? '';
  return '\n\n```mermaid\n' + source.trim() + '\n```\n\n';
}

function createConverter() {
  const converter = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    hr: '---',
    // Diagram blocks have no children (the source is an attribute), so Turndown sees them as blank
    // and would drop them before any rule runs.
    blankReplacement: (_content, node) => {
      if (isMermaidDiagram(node as HTMLElement)) {
        return mermaidFence(node as HTMLElement);
      }
      // Turndown's default behavior; it sets isBlock on every node at runtime (missing from its typings).
      return (node as HTMLElement & { isBlock?: boolean }).isBlock ? '\n\n' : '';
    },
  });

  converter.addRule('strikethrough', {
    filter: ['s', 'del'],
    replacement: (content) => `~~${content}~~`,
  });

  converter.addRule('underline', {
    filter: ['u'],
    replacement: (content) => `<u>${content}</u>`,
  });

  // Turndown pads list markers to four characters ("-   item"); a single space is what people write.
  converter.addRule('listItem', {
    filter: 'li',
    replacement: (content, node) => {
      const parent = node.parentNode as HTMLElement;
      const isOrdered = parent.nodeName === 'OL';
      const startNumber = Number(parent.getAttribute('start') ?? 1);
      const itemIndex = Array.prototype.indexOf.call(parent.children, node);
      const marker = isOrdered ? `${startNumber + itemIndex}.` : '-';
      const indentation = ' '.repeat(marker.length + 1);
      const itemText = content
        .replace(/^\n+/, '')
        .replace(/\n+$/, '\n')
        // A nested list follows its parent's text directly, keeping the list tight.
        .replace(/\n{2,}(?=(?:-|\d+\.) )/g, '\n')
        .replace(/\n/g, `\n${indentation}`)
        // Blank lines inside an item must not carry indentation-only trailing spaces.
        .replace(/\n +(?=\n)/g, '\n');
      const isLastItem = !node.nextSibling;
      return `${marker} ${itemText.trimEnd()}${isLastItem ? '' : '\n'}`;
    },
  });

  return converter;
}

const converter = createConverter();

/** Converts the editor's HTML (the stored document format) into GitHub-flavored Markdown. */
export function documentHtmlToMarkdown(html: string): string {
  return converter.turndown(html).trim();
}

/** A safe "<title>.md" file name for the download. */
export function markdownFileName(documentTitle: string): string {
  const safeTitle = documentTitle.replace(INVALID_FILE_NAME_CHARACTERS, ' ').replace(/\s+/g, ' ').trim();
  return `${safeTitle || FALLBACK_FILE_NAME}.md`;
}

/** Downloads the document as a Markdown file, built from what is currently in the editor. */
export function downloadMarkdown(documentTitle: string, html: string) {
  const markdownFile = new Blob([`${documentHtmlToMarkdown(html)}\n`], { type: 'text/markdown;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(markdownFile);
  const downloadLink = document.createElement('a');
  downloadLink.href = downloadUrl;
  downloadLink.download = markdownFileName(documentTitle);
  downloadLink.click();
  URL.revokeObjectURL(downloadUrl);
}
