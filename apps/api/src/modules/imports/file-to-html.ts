import path from 'node:path';
import mammoth from 'mammoth';
import { marked } from 'marked';
import { badRequest, unsupportedMediaType } from '../../lib/errors.js';
import { MAX_TITLE_LENGTH } from '../documents/document.schemas.js';

export const SUPPORTED_IMPORT_EXTENSIONS = ['.txt', '.md', '.docx'] as const;
export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;

type SupportedExtension = (typeof SUPPORTED_IMPORT_EXTENSIONS)[number];

export interface ConvertedFile {
  title: string;
  /** Unsanitized HTML; the documents service sanitizes it before storage. */
  html: string;
}

/** Validates the extension up front so unsupported files are rejected before their bytes are read. */
export function assertSupportedFile(fileName: string): SupportedExtension {
  const extension = path.extname(fileName).toLowerCase();
  if (!isSupportedExtension(extension)) {
    throw unsupportedMediaType(
      `"${extension || fileName}" files are not supported. Upload a ${SUPPORTED_IMPORT_EXTENSIONS.join(', ')} file.`,
    );
  }
  return extension;
}

export async function convertFileToHtml(fileName: string, fileContent: Buffer): Promise<ConvertedFile> {
  const extension = assertSupportedFile(fileName);
  if (fileContent.length === 0) {
    throw badRequest('The uploaded file is empty.');
  }

  const html = await CONVERTERS[extension](fileContent);
  return { title: titleFromFileName(fileName), html };
}

const CONVERTERS: Record<SupportedExtension, (fileContent: Buffer) => Promise<string>> = {
  '.txt': async (fileContent) => plainTextToHtml(fileContent.toString('utf8')),
  '.md': async (fileContent) => marked.parse(fileContent.toString('utf8'), { async: false }),
  '.docx': async (fileContent) => {
    try {
      const result = await mammoth.convertToHtml({ buffer: fileContent });
      return result.value;
    } catch {
      throw badRequest('This .docx file could not be read. It may be corrupted or password protected.');
    }
  },
};

/** Blank lines separate paragraphs; single line breaks inside a paragraph are kept. */
export function plainTextToHtml(text: string): string {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\r?\n/g, '<br>')}</p>`)
    .join('');
}

export function titleFromFileName(fileName: string): string {
  const baseName = path.basename(fileName, path.extname(fileName)).trim();
  return (baseName || 'Imported document').slice(0, MAX_TITLE_LENGTH);
}

function isSupportedExtension(extension: string): extension is SupportedExtension {
  return (SUPPORTED_IMPORT_EXTENSIONS as readonly string[]).includes(extension);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
