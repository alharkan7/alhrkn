'use client';

import React, { useEffect, useLayoutEffect, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { $getRoot, $createParagraphNode, $createTextNode, EditorState, $insertNodes } from 'lexical';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import ToolbarPlugin from './ToolbarPlugin';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Plugin to initialize editor with HTML content
function InitializePlugin({ html }: { html: string }) {
  const [editor] = useLexicalComposerContext();
  const [isInitialized, setIsInitialized] = useState(false);

  useLayoutEffect(() => {
    if (isInitialized) return;
    
    if (html && html.trim()) {
      editor.update(() => {
        const root = $getRoot();
        root.clear();
        
        const parser = new DOMParser();
        const dom = parser.parseFromString(html, 'text/html');
        const nodes = $generateNodesFromDOM(editor, dom);
        
        // Filter to only include element nodes
        const validNodes = nodes.filter(node => {
          const type = node.getType();
          return type !== 'text' && type !== 'linebreak';
        });
        
        if (validNodes.length > 0) {
          root.append(...validNodes);
        } else {
          // If no valid nodes, create paragraph with text content
          const paragraph = $createParagraphNode();
          const textContent = dom.body.textContent || '';
          if (textContent.trim()) {
            paragraph.append($createTextNode(textContent));
          }
          root.append(paragraph);
        }
      });
    }
    
    setIsInitialized(true);
  }, [editor, html, isInitialized]);

  return null;
}

export default function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const initialConfig = {
    namespace: 'FlowNoteEditor',
    theme: {
      paragraph: 'mb-2',
      text: {
        bold: 'font-bold',
        italic: 'italic',
        underline: 'underline',
      },
      list: {
        ul: 'list-disc ml-4 mb-2',
        ol: 'list-decimal ml-4 mb-2',
        listitem: 'mb-1',
      },
      link: 'text-blue-600 dark:text-blue-400 underline hover:opacity-80',
    },
    onError: (error: Error) => {
      console.error('Lexical error:', error);
    },
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      LinkNode,
      AutoLinkNode,
    ],
  };

  const handleChange = (editorState: EditorState, editor: any) => {
    editorState.read(() => {
      const html = $generateHtmlFromNodes(editor);
      onChange(html);
    });
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="rich-text-editor border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <ToolbarPlugin />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable 
                className={`outline-none min-h-[3em] p-3 ${className || ''}`}
                style={{ minHeight: '3em' }}
              />
            }
            placeholder={
              <div className="absolute top-3 left-3 text-slate-400 dark:text-slate-600 pointer-events-none">
                {placeholder || 'Type your content here...'}
              </div>
            }
            ErrorBoundary={(props) => <div className="text-red-500 p-2">Error loading editor</div>}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <OnChangePlugin onChange={handleChange} />
        <InitializePlugin html={value} />
      </div>
    </LexicalComposer>
  );
}
