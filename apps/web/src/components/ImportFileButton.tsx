import { Upload } from 'lucide-react';
import { useRef } from 'react';
import { Button } from './Button';

export const SUPPORTED_IMPORT_EXTENSIONS = ['.txt', '.md', '.docx'];
export const MAX_IMPORT_FILE_MEGABYTES = 5;

interface ImportFileButtonProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

/** Opens the file picker restricted to the formats the API can convert. */
export function ImportFileButton({ onFileSelected, disabled }: ImportFileButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Button
        variant="secondary"
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
        title={`Supports ${SUPPORTED_IMPORT_EXTENSIONS.join(', ')} up to ${MAX_IMPORT_FILE_MEGABYTES} MB`}
      >
        <Upload size={16} aria-hidden="true" />
        Import file
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept={SUPPORTED_IMPORT_EXTENSIONS.join(',')}
        className="hidden"
        aria-label="Choose a .txt, .md or .docx file to import"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Reset so picking the same file again still triggers a change.
          event.target.value = '';
          if (file) {
            onFileSelected(file);
          }
        }}
      />
    </>
  );
}
