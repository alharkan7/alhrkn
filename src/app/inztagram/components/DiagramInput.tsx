import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, LoaderCircle, Paperclip, Dices, ChevronDown } from 'lucide-react';
import { DIAGRAM_TYPES, DIAGRAM_THEMES } from './diagram-types';
import { Input } from '@/components/ui/input';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import styles from './DiagramInput.module.css';

interface DiagramInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  onFocusChange?: (focused: boolean) => void;
  onSend?: (value: string, type: string, theme: string, pdfUrl?: string, pdfName?: string) => void;
  pdfFile?: { name: string; type: string; url: string; uploaded?: boolean } | null;
  uploading?: boolean;
  onFileSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile?: () => void;
  onRandomize?: () => void;
}

export function DiagramInput({
  value,
  onChange,
  placeholder = 'Type a message...',
  disabled = false,
  loading = false,
  onFocusChange,
  onSend,
  pdfFile,
  uploading,
  onFileSelect,
  onClearFile,
  onRandomize,
}: DiagramInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [diagramType, setDiagramType] = useState<string | undefined>(undefined);
  const [diagramTheme, setDiagramTheme] = useState(DIAGRAM_THEMES[0].value);

  // Preload all diagram type images on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      DIAGRAM_TYPES.forEach(type => {
        const img = new window.Image();
        img.src = type.image;
      });
    }
  }, []);

  const handleFocus = () => {
    setIsFocused(true);
    onFocusChange?.(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    onFocusChange?.(false);
  };

  const handleFileButtonClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  return (
    <form onSubmit={e => {
      e.preventDefault();
      if (onSend) {
        onSend(value, diagramType ?? '', diagramTheme, pdfFile?.url, pdfFile?.name);
      }
    }} className={`relative flex flex-col gap-2 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-colors duration-200 max-w-2xl mx-auto w-full 
        ${isFocused ? 'border-[3px] border-ring shadow-[3px_3px_0px_0px_var(--ring)]' : 'border-[2px] border-border shadow-[var(--shadow)]'}
        bg-bw rounded-lg p-2`}>

      <div className="flex flex-col gap-2 w-full">
        <textarea
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full mt-4 mb-2 bg-transparent border-0 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none disabled:opacity-50 p-0 resize-none min-h-[40px] max-h-[150px] overflow-y-auto px-1 pb-1 text-md break-words whitespace-pre-wrap"
          onFocus={handleFocus}
          onBlur={handleBlur}
          rows={1}
          style={{ height: 'auto', maxHeight: '150px', overflowY: 'auto' }}
          disabled={disabled || loading}
          onInput={e => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${target.scrollHeight}px`;
          }}
          {...{
            ...(typeof window !== 'undefined' && {
              ref: (el: HTMLTextAreaElement | null) => {
                inputRef.current = el;
                if (el) {
                  el.style.height = 'auto';
                  el.style.height = `${el.scrollHeight}px`;
                }
              }
            })
          }}
        />
        <Input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="application/pdf"
          onChange={onFileSelect}
        />
        <div className="flex flex-row md:flex-row gap-2 mb-2 items-center md:justify-between w-full">
          <div className="flex flex-row flex-wrap gap-2 flex-1 min-w-0">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="default"
                  className="w-auto max-w-[220px] sm:max-w-[120px] flex items-center gap-2 justify-between px-3 min-w-0"
                  disabled={disabled || loading}
                  aria-label="Select diagram type"
                >
                  {diagramType
                    ? (
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="truncate block max-w-[80px] sm:max-w-[60px]">
                          {DIAGRAM_TYPES.find(t => t.value === diagramType)?.label}
                        </span>
                      </span>
                    )
                    : <span className="text-primary truncate block max-w-[100px] sm:max-w-[60px]">Auto</span>
                  }
                  <ChevronDown className="size-4 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="py-2 !pl-2 pr-2 md:pr-1 w-[350px] max-w-[95vw] !mx-2">
                <div className={cn(styles['diagram-scrollbar'], 'grid grid-cols-2 gap-2 max-h-[300px] overflow-auto')} style={{ scrollbarWidth: 'thin' }}>
                  <button
                    type="button"
                    className={cn(
                      'flex flex-col items-center justify-between h-[110px] rounded-base border-2 border-border bg-background p-2 transition-colors hover:bg-accent focus:outline-none',
                      !diagramType && 'ring-2 ring-primary border-primary',
                    )}
                    onClick={() => setDiagramType(undefined)}
                  >
                    <div className="flex-1 w-full flex items-center justify-center">
                      <div className="w-full h-[60px] flex items-center justify-center rounded text-xs text-muted-foreground/80"><Sparkles className="size-6" /></div>
                    </div>
                    <span className="text-xs font-medium mt-1 mb-0">Auto</span>
                  </button>
                  {DIAGRAM_TYPES.map((type) => (
                    <button
                      type="button"
                      key={type.value}
                      className={cn(
                        'flex flex-col items-center justify-between h-[110px] rounded-base border-2 border-border bg-background p-2 transition-colors hover:bg-accent focus:outline-none',
                        diagramType === type.value && 'ring-2 ring-primary border-primary',
                      )}
                      onClick={() => setDiagramType(type.value)}
                    >
                      <div className="flex-1 w-full flex items-center justify-center">
                        <Image
                          src={type.image}
                          alt={type.label}
                          width={80}
                          height={60}
                          className="w-full h-[60px] object-contain rounded border border-border"
                        />
                      </div>
                      <span className="text-xs font-medium text-center line-clamp-2 mt-1 mb-0 w-full">{type.label}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="default" size="icon"
              className="shrink-0 p-2 transition-colors disabled:opacity-50"
              disabled={disabled || loading || !!pdfFile}
              aria-label="Randomize Diagram"
              type="button"
              onClick={onRandomize}
            >
              <Dices className="size-5" />
            </Button>
          </div>
          <Button
            type="button"
            onClick={handleFileButtonClick}
            className="shrink-0 p-2 transition-colors disabled:opacity-50"
            disabled={disabled || loading || !!pdfFile}
            aria-label="Attach PDF"
          >
            <Paperclip className="size-5" />
          </Button>
          <Button
            type="submit"
            className="shrink-0 grow-0 p-2 transition-colors disabled:opacity-50 w-auto"
            disabled={disabled || loading || uploading || (!value.trim() && !pdfFile)}
            aria-label="Send diagram"
          >
            {loading ? (
              <>
                <LoaderCircle className="size-5 animate-spin" /> Creating
              </>
            ) : (
              <>
                <Sparkles className="size-5" /> Create
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
