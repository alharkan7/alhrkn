'use client';

import { Editor } from '@tiptap/react';
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Heading1, Heading2 } from 'lucide-react';
import { useCallback } from 'react';

interface ToolbarPluginProps {
  editor: Editor;
}

export default function ToolbarPlugin({ editor }: ToolbarPluginProps) {
  const formatBold = useCallback(() => {
    editor.chain().focus().toggleBold().run();
  }, [editor]);

  const formatItalic = useCallback(() => {
    editor.chain().focus().toggleItalic().run();
  }, [editor]);

  const formatHeading = useCallback((level: 1 | 2) => {
    editor.chain().focus().toggleHeading({ level }).run();
  }, [editor]);

  const formatBulletList = useCallback(() => {
    editor.chain().focus().toggleBulletList().run();
  }, [editor]);

  const formatNumberedList = useCallback(() => {
    editor.chain().focus().toggleOrderedList().run();
  }, [editor]);

  const insertLink = useCallback(() => {
    const url = prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  return (
    <div className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex-wrap">
      <button
        type="button"
        onClick={formatBold}
        className={`p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors ${editor.isActive('bold') ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'
          }`}
        title="Bold"
        aria-label="Format text as bold"
      >
        <Bold size={16} />
      </button>
      <button
        type="button"
        onClick={formatItalic}
        className={`p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors ${editor.isActive('italic') ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'
          }`}
        title="Italic"
        aria-label="Format text as italic"
      >
        <Italic size={16} />
      </button>
      <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1" />
      <button
        type="button"
        onClick={() => formatHeading(1)}
        className={`p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'
          }`}
        title="Heading 1"
        aria-label="Format as heading 1"
      >
        <Heading1 size={16} />
      </button>
      <button
        type="button"
        onClick={() => formatHeading(2)}
        className={`p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'
          }`}
        title="Heading 2"
        aria-label="Format as heading 2"
      >
        <Heading2 size={16} />
      </button>
      <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1" />
      <button
        type="button"
        onClick={formatBulletList}
        className={`p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors ${editor.isActive('bulletList') ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'
          }`}
        title="Bullet List"
        aria-label="Format as bullet list"
      >
        <List size={16} />
      </button>
      <button
        type="button"
        onClick={formatNumberedList}
        className={`p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors ${editor.isActive('orderedList') ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'
          }`}
        title="Numbered List"
        aria-label="Format as numbered list"
      >
        <ListOrdered size={16} />
      </button>
      <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1" />
      <button
        type="button"
        onClick={insertLink}
        className={`p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors ${editor.isActive('link') ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'
          }`}
        title="Add Link"
        aria-label="Insert link"
      >
        <LinkIcon size={16} />
      </button>
    </div>
  );
}
