'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon, Heading1, Heading2 } from 'lucide-react';
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
} from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import { $createHeadingNode } from '@lexical/rich-text';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import { useCallback } from 'react';

export default function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();

  const formatBold = useCallback(() => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
  }, [editor]);

  const formatItalic = useCallback(() => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
  }, [editor]);

  const formatUnderline = useCallback(() => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
  }, [editor]);

  const formatHeading = useCallback((headingSize: 'h1' | 'h2') => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(headingSize));
      }
    });
  }, [editor]);

  const formatBulletList = useCallback(() => {
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
  }, [editor]);

  const formatNumberedList = useCallback(() => {
    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
  }, [editor]);

  const insertLink = useCallback(() => {
    const url = prompt('Enter URL:');
    if (url) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
    }
  }, [editor]);

  return (
    <div className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex-wrap">
      <button
        type="button"
        onClick={formatBold}
        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 transition-colors"
        title="Bold"
        aria-label="Format text as bold"
      >
        <Bold size={16} />
      </button>
      <button
        type="button"
        onClick={formatItalic}
        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 transition-colors"
        title="Italic"
        aria-label="Format text as italic"
      >
        <Italic size={16} />
      </button>
      <button
        type="button"
        onClick={formatUnderline}
        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 transition-colors"
        title="Underline"
        aria-label="Format text as underline"
      >
        <Underline size={16} />
      </button>
      <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1" />
      <button
        type="button"
        onClick={() => formatHeading('h1')}
        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 transition-colors"
        title="Heading 1"
        aria-label="Format as heading 1"
      >
        <Heading1 size={16} />
      </button>
      <button
        type="button"
        onClick={() => formatHeading('h2')}
        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 transition-colors"
        title="Heading 2"
        aria-label="Format as heading 2"
      >
        <Heading2 size={16} />
      </button>
      <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1" />
      <button
        type="button"
        onClick={formatBulletList}
        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 transition-colors"
        title="Bullet List"
        aria-label="Format as bullet list"
      >
        <List size={16} />
      </button>
      <button
        type="button"
        onClick={formatNumberedList}
        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 transition-colors"
        title="Numbered List"
        aria-label="Format as numbered list"
      >
        <ListOrdered size={16} />
      </button>
      <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1" />
      <button
        type="button"
        onClick={insertLink}
        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 transition-colors"
        title="Add Link"
        aria-label="Insert link"
      >
        <LinkIcon size={16} />
      </button>
    </div>
  );
}

