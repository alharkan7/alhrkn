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
        flex flex-col p-4 border-l border-border
      `}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Archived Content</h2>
        <Button variant="neutral" size="icon" onClick={onClose}>
          <X className="h-6 w-6" />
        </Button>
      </div>
      <div className="prose prose-sm dark:prose-invert max-w-none overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-muted-foreground/50 scrollbar-track-transparent">
        <ReactMarkdown>{markdownContent}</ReactMarkdown>
      </div>
    </div>
  );
};

export default ArchivedContentViewer; 