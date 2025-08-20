'use client';

import { Download, FileText, FileCode, FileType, File } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface ToolbarProps {
  onDownload: (format: 'pdf' | 'markdown' | 'txt' | 'docx') => void;
}

export function Toolbar({ onDownload }: ToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-bw pb-2 shadow-[var(--shadow)]">
      
      {/* Left side - placeholder for future tools */}
      <div className="flex items-center space-x-2">
        {/* Add your left-side tools here */}
      </div>

      {/* Right side - download dropdown */}
      <div className="flex items-center space-x-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="noShadow" size="sm" className="bg-main text-mtext border-border hover:bg-main/90">
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
