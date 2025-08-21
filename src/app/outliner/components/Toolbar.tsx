'use client';

import { Download, FileText, FileCode, FileType, File, ArrowLeft, Quote, MessageCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface ToolbarProps {
  onDownload: (format: 'pdf' | 'markdown' | 'txt' | 'docx') => void;
  onOpenChat?: () => void;
}

export function Toolbar({ onDownload, onOpenChat }: ToolbarProps) {
  const router = useRouter();
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border py-2 shadow-[var(--shadow)] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      
      {/* Left side - back button */}
      <div className="flex items-center space-x-2">
        <Button
          variant="default"
          size="sm"
          className="bg-main text-mtext border-border hover:bg-main/90"
          aria-label="Go Back"
          onClick={() => router.push('/outliner')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Middle - citations and chat */}
      <div className="flex items-center justify-center space-x-2">
        <Button
          variant="default"
          size="sm"
          className="text-text border border-border"
          aria-label="Open Citations"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('outliner-open-citations'));
            }
          }}
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          variant="default"
          size="sm"
          className="text-text border border-border"
          aria-label="Open Chat"
          onClick={(e) => {
            e.preventDefault();
            if (onOpenChat) {
              onOpenChat();
            }
          }}
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
      </div>

      {/* Right side - download dropdown */}
      <div className="flex items-center space-x-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" size="sm" className="bg-main text-mtext border-border hover:bg-main/90">
              <Download className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-30">
            <DropdownMenuItem onClick={() => onDownload('pdf')}>
              <FileText className="h-4 w-4" />
              <span>PDF</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownload('markdown')}>
              <FileCode className="h-4 w-4" />
              <span>Markdown</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownload('txt')}>
              <FileType className="h-4 w-4" />
              <span>Text</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownload('docx')}>
              <File className="h-4 w-4" />
              <span>Word</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
