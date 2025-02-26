'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { FORMAT_TEXT_COMMAND } from 'lexical';
import { INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from '@lexical/list';
import {
  BiBold,
  BiItalic,
  BiUnderline,
  BiListUl,
  BiListOl,
} from 'react-icons/bi';

export function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();

  return (
    <div className="toolbar border-b p-2 flex gap-2 items-center">
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        className="p-2 hover:bg-gray-100 rounded"
        aria-label="Format Bold"
      >
        <BiBold className="w-5 h-5" />
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        className="p-2 hover:bg-gray-100 rounded"
        aria-label="Format Italic"
      >
        <BiItalic className="w-5 h-5" />
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
        className="p-2 hover:bg-gray-100 rounded"
        aria-label="Format Underline"
      >
        <BiUnderline className="w-5 h-5" />
      </button>
      <div className="w-px h-6 bg-gray-200 mx-2" />
      <button
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
        className="p-2 hover:bg-gray-100 rounded"
        aria-label="Insert Bullet List"
      >
        <BiListUl className="w-5 h-5" />
      </button>
      <button
        onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
        className="p-2 hover:bg-gray-100 rounded"
        aria-label="Insert Numbered List"
      >
        <BiListOl className="w-5 h-5" />
      </button>
    </div>
  );
}