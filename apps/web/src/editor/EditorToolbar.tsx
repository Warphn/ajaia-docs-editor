import { useEditorState, type Editor } from '@tiptap/react';
import {
  Bold,
  Code2,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

type BlockStyle = 'paragraph' | 'heading1' | 'heading2' | 'heading3';

const BLOCK_STYLE_LABELS: Record<BlockStyle, string> = {
  paragraph: 'Normal text',
  heading1: 'Heading 1',
  heading2: 'Heading 2',
  heading3: 'Heading 3',
};

export function EditorToolbar({ editor, children }: { editor: Editor; children?: ReactNode }) {
  // Subscribing through useEditorState re-renders the toolbar only when these values change.
  const state = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      blockStyle: currentBlockStyle(currentEditor),
      isBold: currentEditor.isActive('bold'),
      isItalic: currentEditor.isActive('italic'),
      isUnderline: currentEditor.isActive('underline'),
      isStrike: currentEditor.isActive('strike'),
      isBulletList: currentEditor.isActive('bulletList'),
      isOrderedList: currentEditor.isActive('orderedList'),
      isBlockquote: currentEditor.isActive('blockquote'),
      isCodeBlock: currentEditor.isActive('codeBlock'),
      canUndo: currentEditor.can().undo(),
      canRedo: currentEditor.can().redo(),
    }),
  });

  function applyBlockStyle(blockStyle: BlockStyle) {
    const chain = editor.chain().focus();
    if (blockStyle === 'paragraph') {
      chain.setParagraph().run();
    } else {
      const level = Number(blockStyle.replace('heading', '')) as 1 | 2 | 3;
      chain.setHeading({ level }).run();
    }
  }

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-0.5 border-b border-line bg-sheet px-2 py-1.5 sm:px-4"
    >
      <ToolbarButton icon={Undo2} label="Undo (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()} disabled={!state.canUndo} />
      <ToolbarButton icon={Redo2} label="Redo (Ctrl+Shift+Z)" onClick={() => editor.chain().focus().redo().run()} disabled={!state.canRedo} />
      <Divider />
      <label className="sr-only" htmlFor="block-style">
        Text style
      </label>
      <select
        id="block-style"
        value={state.blockStyle}
        onChange={(event) => applyBlockStyle(event.target.value as BlockStyle)}
        className="h-8 rounded-md border border-transparent bg-transparent px-2 text-sm hover:border-line focus:border-primary"
      >
        {Object.entries(BLOCK_STYLE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <Divider />
      <ToolbarButton icon={Bold} label="Bold (Ctrl+B)" isActive={state.isBold} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolbarButton icon={Italic} label="Italic (Ctrl+I)" isActive={state.isItalic} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolbarButton icon={Underline} label="Underline (Ctrl+U)" isActive={state.isUnderline} onClick={() => editor.chain().focus().toggleUnderline().run()} />
      <ToolbarButton icon={Strikethrough} label="Strikethrough" isActive={state.isStrike} onClick={() => editor.chain().focus().toggleStrike().run()} />
      <Divider />
      <ToolbarButton icon={List} label="Bulleted list" isActive={state.isBulletList} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <ToolbarButton icon={ListOrdered} label="Numbered list" isActive={state.isOrderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <ToolbarButton icon={Quote} label="Quote" isActive={state.isBlockquote} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
      <ToolbarButton icon={Code2} label="Code block" isActive={state.isCodeBlock} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
      <Divider />
      <button
        type="button"
        title="Insert a Mermaid diagram (flowchart, sequence, ER…)"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().insertMermaidDiagram().run()}
        className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
      >
        <Workflow size={17} aria-hidden="true" />
        Diagram
      </button>
      {children}
    </div>
  );
}

function currentBlockStyle(editor: Editor): BlockStyle {
  for (const level of [1, 2, 3] as const) {
    if (editor.isActive('heading', { level })) {
      return `heading${level}`;
    }
  }
  return 'paragraph';
}

interface ToolbarButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
}

export function ToolbarButton({ icon: Icon, label, onClick, isActive = false, disabled = false }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={isActive}
      disabled={disabled}
      // Keep the text selection when clicking a toolbar button.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={
        'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-35 ' +
        (isActive ? 'bg-primary-soft text-primary' : 'text-ink-muted hover:bg-canvas hover:text-ink')
      }
    >
      <Icon size={17} aria-hidden="true" />
    </button>
  );
}

export function Divider() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />;
}
