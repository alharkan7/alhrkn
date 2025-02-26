'use client';

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { AppsHeader } from '@/components/apps-header';
import AppsFooter from '@/components/apps-footer';
import { ToolbarPlugin } from './plugins/ToolbarPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { ListNode, ListItemNode } from '@lexical/list';
import { PredictionNode, $isPredictionNode, $createPredictionNode } from './plugins/PredictionNode';
import PredictionPlugin from './plugins/PredictionPlugin';

const initialConfig = {
  namespace: 'Scholar',
  onError: (error: Error) => console.error(error),
  nodes: [ListNode, ListItemNode, PredictionNode],
  theme: {
    text: {
      bold: 'font-bold',
      italic: 'italic',
      underline: 'underline',
    },
  },
};

export default function ScholarPage() {
  return (
    <div className="editor-container p-4 flex flex-col h-screen">
      <div className="fixed top-0 left-0 right-0 z-50">
        <AppsHeader />
      </div>
      <div className="editor-top flex-none mt-16">
        <div className="editor-title max-w-[850px] mx-auto">
          <h1 className="text-2xl font-semibold mb-4">Scholar Page</h1>

          <LexicalComposer initialConfig={initialConfig}>
            <div className="editor-inner bg-white shadow-lg rounded-lg">
              <ToolbarPlugin />
              <div className="editor-content p-8 min-h-[1056px] bg-white">
                <RichTextPlugin
                  contentEditable={
                    <ContentEditable 
                      className="editor-input outline-none min-h-full"
                      style={{
                        fontSize: '16px',
                        lineHeight: '1.5',
                        fontFamily: 'Arial'
                      }}
                    />
                  }
                  placeholder={<div className="editor-placeholder text-gray-400">Start writing...</div>}
                  ErrorBoundary={LexicalErrorBoundary}
                />
              </div>
              <HistoryPlugin />
              <ListPlugin />
              <PredictionPlugin />
            </div>
          </LexicalComposer>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-2 text-center text-gray-600 text-xs bg-background">
        <div className="flex-none">
          <AppsFooter />
        </div>
      </div>
    </div>
  );
}