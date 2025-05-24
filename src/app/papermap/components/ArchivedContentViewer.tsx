'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ArchivedContentViewerProps {
  markdownContent: string;
  onClose: () => void;
  isOpen: boolean;
}

const ArchivedContentViewer: React.FC<ArchivedContentViewerProps> = ({ 
  markdownContent,
  onClose,
  isOpen
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className={`
        fixed top-0 right-0 h-full w-full md:w-2/5 bg-card shadow-xl z-50 
        transform transition-transform duration-300 ease-in-out 
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        flex flex-col py-4 pr-4 pl-6 border-l border-border
      `}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Parsed PDF Content</h2>
        <Button variant="neutral" size="icon" onClick={onClose}>
          <X className="h-6 w-6" />
        </Button>
      </div>
      <div className="markdown-content prose prose-sm dark:prose-invert max-w-none prose-headings:mt-2 prose-headings:mb-1 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:my-1 prose-blockquote:my-1 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-muted-foreground/50 scrollbar-track-transparent">
        <ReactMarkdown>{
          (() => {
            const marker = 'Markdown Content:';
            const idx = markdownContent.indexOf(marker);
            let content = idx !== -1 ? markdownContent.slice(idx + marker.length).trimStart() : markdownContent;

            // Split into paragraphs by double line breaks
            const paragraphs = content.split(/\r?\n\r?\n/);
            const processedParagraphs = paragraphs.map(paragraph => {
              const lines = paragraph.split(/\r?\n/);
              let result = [];
              let buffer = '';
              for (let line of lines) {
                line = line.trim();
                if (buffer) buffer += ' ';
                buffer += line;
                if (line.endsWith('.')) {
                  result.push(buffer.trim());
                  buffer = '';
                }
              }
              if (buffer) result.push(buffer.trim());
              return result.join(' ');
            });
            return processedParagraphs.join('\n\n');
          })()
        }</ReactMarkdown>
      </div>
    </div>
  );
};

export default ArchivedContentViewer; 